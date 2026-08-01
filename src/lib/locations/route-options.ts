import type { LocationRow } from "@/lib/data/types";
import type { RouteOption } from "@/lib/trips/engine";

/**
 * Kategoria decyduje o priorytecie w silniku auto-rozpisywania:
 * 1 = codzienne dojazdy (myjnia, budowa/Strupin) — wypełniane najpierw,
 * 2 = eskalacja gdy codzienne trasy nie pokryją miesiąca (Warszawa),
 * 3 = sporadyczne lokalne (hurtownie, banki, inne),
 * 4 = rzadkie dalekie wyjazdy dobierane na samym końcu (LR, Nerta).
 */
function tierForCategory(kategoria: string): 1 | 2 | 3 | 4 {
  if (kategoria === "inwestycja" || kategoria === "myjnia") return 1;
  if (kategoria === "warszawa") return 2;
  if (kategoria === "nerta" || kategoria === "lr") return 4;
  return 3;
}

export function locationsToRouteOptions(locations: LocationRow[]): RouteOption[] {
  return locations
    .filter((l) => l.aktywny)
    .map((l) => ({
      locationId: l.id,
      nazwa: l.nazwa,
      cel: l.domyslny_cel,
      oneWayKm: Number(l.one_way_km),
      waga: l.waga_czestotliwosci,
      tier: tierForCategory(l.kategoria),
    }));
}
