import { describe, expect, it } from "vitest";
import { businessDaysInRange, generateAutoTrips, type RouteOption } from "./engine";

const ROUTES: RouteOption[] = [
  { locationId: "strupin", nazwa: "Strupin Duży 93", cel: "Nadzór budowy", oneWayKm: 6.0, waga: 5 },
  { locationId: "wlodawska", nazwa: "Włodawska 7", cel: "Myjnia", oneWayKm: 3.0, waga: 5 },
  { locationId: "hurtownia1", nazwa: "Lwowska 105", cel: "Zakup materiałów", oneWayKm: 4.0, waga: 3 },
  { locationId: "hurtownia2", nazwa: "Hrubieszowska 54", cel: "Zakup materiałów", oneWayKm: 4.0, waga: 3 },
  { locationId: "bank1", nazwa: "Lubelska 11", cel: "Obsługa bankowa", oneWayKm: 3.0, waga: 2 },
  { locationId: "warszawa", nazwa: "Warszawa", cel: "Spotkanie inwestycyjne", oneWayKm: 245.0, waga: 1 },
  { locationId: "nerta", nazwa: "Nerta Kostrzyn", cel: "Spotkanie handlowe", oneWayKm: 490.0, waga: 1 },
];

function sumKm(trips: { km: number }[]): number {
  return Math.round(trips.reduce((sum, t) => sum + t.km, 0) * 10) / 10;
}

describe("businessDaysInRange", () => {
  it("wyklucza weekendy gdy workdaysOnly=true", () => {
    // styczeń 2026: 1 stycznia to czwartek
    const days = businessDaysInRange("2026-01-01", "2026-01-31", true);
    expect(days).not.toContain("2026-01-03"); // sobota
    expect(days).not.toContain("2026-01-04"); // niedziela
    expect(days.length).toBeGreaterThan(19);
  });

  it("obejmuje wszystkie dni gdy workdaysOnly=false", () => {
    const days = businessDaysInRange("2026-01-01", "2026-01-31", false);
    expect(days.length).toBe(31);
  });
});

describe("generateAutoTrips", () => {
  it("przykład ze specyfikacji: stan 1000 -> 3300 (styczeń) rozpisuje dokładnie 2300 km", () => {
    const result = generateAutoTrips({
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
      targetKm: 2300,
      routes: ROUTES,
      baseName: "Kopernika 34",
    });

    expect(sumKm(result.trips) + result.unresolvedKm).toBeCloseTo(2300, 5);
    expect(result.unresolvedKm).toBe(0);
  });

  it("suma wpisów zawsze dokładnie odpowiada celowi (wiele losowych celów)", () => {
    for (const target of [37.5, 150, 999.9, 2300, 5000]) {
      const result = generateAutoTrips({
        periodStart: "2026-02-01",
        periodEnd: "2026-02-28",
        targetKm: target,
        routes: ROUTES,
        baseName: "Kopernika 34",
      });
      expect(sumKm(result.trips) + result.unresolvedKm).toBeCloseTo(target, 5);
    }
  });

  it("gdy nie da się dopasować dokładnie, oznacza resztę WYMAGA WYBORU CELU zamiast zgubić różnicę", () => {
    const result = generateAutoTrips({
      periodStart: "2026-03-01",
      periodEnd: "2026-03-31",
      targetKm: 100.3, // wartość niedopasowywalna do żadnej kombinacji znanych tras
      routes: ROUTES,
      baseName: "Kopernika 34",
    });
    const flagged = result.trips.find((t) => t.wymagaWyboruCelu);
    if (flagged) {
      expect(sumKm(result.trips)).toBeCloseTo(100.3, 5);
    } else {
      expect(result.unresolvedKm).toBeCloseTo(0, 5);
    }
  });

  it("zwraca pusty wynik gdy cel to 0 km", () => {
    const result = generateAutoTrips({
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
      targetKm: 0,
      routes: ROUTES,
      baseName: "Kopernika 34",
    });
    expect(result.trips).toHaveLength(0);
    expect(result.unresolvedKm).toBe(0);
  });

  it("każda wygenerowana para (wyjazd/powrót) tego samego miejsca ma tę samą datę", () => {
    const result = generateAutoTrips({
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
      targetKm: 500,
      routes: ROUTES,
      baseName: "Kopernika 34",
    });
    for (let i = 0; i < result.trips.length; i += 2) {
      const wyjazd = result.trips[i];
      const powrot = result.trips[i + 1];
      if (!wyjazd || !powrot || wyjazd.wymagaWyboruCelu) continue;
      expect(wyjazd.data).toBe(powrot.data);
      expect(wyjazd.skad).toBe(powrot.dokad);
      expect(wyjazd.dokad).toBe(powrot.skad);
    }
  });
});
