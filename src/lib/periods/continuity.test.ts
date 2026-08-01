import { describe, expect, it } from "vitest";
import { firstPeriodRange, isLastDayOfMonth, isQuarterEnd, nextPeriodRange } from "./continuity";

describe("firstPeriodRange", () => {
  it("przykład z briefu: rozpoczęcie 14 sierpnia 2026 -> 14-31 sierpnia", () => {
    expect(firstPeriodRange("2026-08-14")).toEqual({ okresOd: "2026-08-14", okresDo: "2026-08-31" });
  });
});

describe("nextPeriodRange", () => {
  it("po 14-31 sierpnia następuje 1-30 września", () => {
    expect(nextPeriodRange("2026-08-31")).toEqual({ okresOd: "2026-09-01", okresDo: "2026-09-30" });
  });

  it("po 1-30 września następuje 1-31 października", () => {
    expect(nextPeriodRange("2026-09-30")).toEqual({ okresOd: "2026-10-01", okresDo: "2026-10-31" });
  });

  it("obsługuje przejście roku (grudzień -> styczeń)", () => {
    expect(nextPeriodRange("2026-12-31")).toEqual({ okresOd: "2027-01-01", okresDo: "2027-01-31" });
  });
});

describe("isQuarterEnd", () => {
  it("rozpoznaje końce kwartałów", () => {
    expect(isQuarterEnd("2026-03-31")).toBe(true);
    expect(isQuarterEnd("2026-06-30")).toBe(true);
    expect(isQuarterEnd("2026-09-30")).toBe(true);
    expect(isQuarterEnd("2026-12-31")).toBe(true);
  });

  it("odrzuca zwykłe końce miesięcy", () => {
    expect(isQuarterEnd("2026-08-31")).toBe(false);
    expect(isQuarterEnd("2026-01-31")).toBe(false);
  });
});

describe("isLastDayOfMonth", () => {
  it("działa dla miesięcy o różnej długości", () => {
    expect(isLastDayOfMonth("2026-02-28")).toBe(true);
    expect(isLastDayOfMonth("2026-04-30")).toBe(true);
    expect(isLastDayOfMonth("2026-01-30")).toBe(false);
  });
});
