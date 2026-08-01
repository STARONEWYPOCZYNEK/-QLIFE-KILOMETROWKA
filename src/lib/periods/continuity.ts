function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function lastDayOfMonth(year: number, monthIndex0: number): Date {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0));
}

export interface PeriodRange {
  okresOd: string;
  okresDo: string;
}

/** Pierwszy okres: od dnia rozpoczęcia wyłącznego użytku firmowego do końca tego miesiąca. */
export function firstPeriodRange(startOfExclusiveUseIso: string): PeriodRange {
  const start = new Date(`${startOfExclusiveUseIso}T00:00:00Z`);
  const end = lastDayOfMonth(start.getUTCFullYear(), start.getUTCMonth());
  return { okresOd: startOfExclusiveUseIso, okresDo: toIso(end) };
}

/** Kolejny okres: pełny miesiąc kalendarzowy następujący po zakończeniu poprzedniego. */
export function nextPeriodRange(previousPeriodEndIso: string): PeriodRange {
  const prevEnd = new Date(`${previousPeriodEndIso}T00:00:00Z`);
  const nextMonthStart = new Date(Date.UTC(prevEnd.getUTCFullYear(), prevEnd.getUTCMonth() + 1, 1));
  const nextMonthEnd = lastDayOfMonth(nextMonthStart.getUTCFullYear(), nextMonthStart.getUTCMonth());
  return { okresOd: toIso(nextMonthStart), okresDo: toIso(nextMonthEnd) };
}

/** Czy podana data (koniec okresu) jest jednocześnie końcem kwartału kalendarzowego (31.03/30.06/30.09/31.12). */
export function isQuarterEnd(dateIso: string): boolean {
  const d = new Date(`${dateIso}T00:00:00Z`);
  const month = d.getUTCMonth(); // 0-indexed
  const day = d.getUTCDate();
  return (
    (month === 2 && day === 31) ||
    (month === 5 && day === 30) ||
    (month === 8 && day === 30) ||
    (month === 11 && day === 31)
  );
}

export function todayIso(): string {
  return toIso(new Date());
}

export function isLastDayOfMonth(dateIso: string): boolean {
  const d = new Date(`${dateIso}T00:00:00Z`);
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));
  return next.getUTCDate() === 1;
}
