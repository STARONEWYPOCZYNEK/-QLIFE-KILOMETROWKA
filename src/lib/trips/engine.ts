export interface RouteOption {
  locationId: string;
  nazwa: string;
  cel: string;
  oneWayKm: number;
  waga: number;
}

export interface GeneratedTripDraft {
  data: string; // ISO yyyy-mm-dd
  skad: string;
  dokad: string;
  cel: string;
  km: number;
  zrodlo: "auto";
  wymagaWyboruCelu: boolean;
  locationId: string | null;
}

export interface AutoFillInput {
  periodStart: string; // ISO yyyy-mm-dd
  periodEnd: string; // ISO yyyy-mm-dd
  targetKm: number;
  routes: RouteOption[];
  baseName: string;
  workdaysOnly?: boolean;
  maxTripsPerDay?: number;
  /** Dates (ISO) already used by manually-entered trips — avoided when picking auto days if possible. */
  occupiedDates?: string[];
  rng?: () => number;
}

export interface AutoFillResult {
  trips: GeneratedTripDraft[];
  /** Km that could not be matched exactly to any known route combination — 0 when fully reconciled. */
  unresolvedKm: number;
}

const KM_SCALE = 10; // internal integer arithmetic in tenths of a km, avoids float drift

function toTenths(km: number): number {
  return Math.round(km * KM_SCALE);
}

function fromTenths(tenths: number): number {
  return tenths / KM_SCALE;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function businessDaysInRange(startIso: string, endIso: string, workdaysOnly = true): string[] {
  const start = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  const days: string[] = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dayOfWeek = d.getUTCDay(); // 0 = niedziela, 6 = sobota
    if (workdaysOnly && (dayOfWeek === 0 || dayOfWeek === 6)) continue;
    days.push(toIsoDate(d));
  }
  return days;
}

function pickWeighted(routes: RouteOption[], rng: () => number): RouteOption {
  const totalWeight = routes.reduce((sum, r) => sum + r.waga, 0);
  let roll = rng() * totalWeight;
  for (const route of routes) {
    roll -= route.waga;
    if (roll <= 0) return route;
  }
  return routes[routes.length - 1];
}

/**
 * Szuka kombinacji pojedynczych odcinków (jedna strona trasy), które sumują się
 * DOKŁADNIE do zadanej reszty w dziesiątych km — do 3 odcinków, dopuszczalne powtórzenia.
 * Lista tras jest mała (~10), więc wyczerpujące przeszukanie jest tanie.
 */
function findExactCombination(
  legsTenths: number[],
  targetTenths: number,
  maxLegs: number,
): number[] | null {
  if (targetTenths === 0) return [];

  function search(remaining: number, depth: number, startIdx: number): number[] | null {
    if (remaining === 0) return [];
    if (depth >= maxLegs) return null;
    for (let i = startIdx; i < legsTenths.length; i++) {
      const legValue = legsTenths[i];
      if (legValue > remaining) continue;
      const rest = search(remaining - legValue, depth + 1, i);
      if (rest !== null) return [legValue, ...rest];
    }
    return null;
  }

  return search(targetTenths, 0, 0);
}

export function generateAutoTrips(input: AutoFillInput): AutoFillResult {
  const {
    periodStart,
    periodEnd,
    targetKm,
    routes,
    baseName,
    workdaysOnly = true,
    maxTripsPerDay = 4,
    occupiedDates = [],
    rng = Math.random,
  } = input;

  const trips: GeneratedTripDraft[] = [];
  let remainingTenths = toTenths(targetKm);
  if (remainingTenths <= 0 || routes.length === 0) {
    return { trips, unresolvedKm: fromTenths(Math.max(remainingTenths, 0)) };
  }

  const allDays = businessDaysInRange(periodStart, periodEnd, workdaysOnly);
  if (allDays.length === 0) {
    return { trips, unresolvedKm: fromTenths(remainingTenths) };
  }

  const freeDays = allDays.filter((d) => !occupiedDates.includes(d));
  const dayPool = freeDays.length > 0 ? freeDays : allDays;
  const tripsPerDay = new Map<string, number>();

  const smallestPairTenths = Math.min(...routes.map((r) => toTenths(r.oneWayKm) * 2));

  let dayCursor = 0;
  let guard = 0;
  const guardLimit = dayPool.length * maxTripsPerDay + 1000;

  while (remainingTenths >= smallestPairTenths && guard < guardLimit) {
    guard += 1;
    const route = pickWeighted(routes, rng);
    const pairTenths = toTenths(route.oneWayKm) * 2;
    if (pairTenths > remainingTenths) continue;

    const day = findDayWithCapacity(dayPool, tripsPerDay, maxTripsPerDay, dayCursor);
    if (!day) break; // wszystkie dni osiągnęły limit
    dayCursor = (dayPool.indexOf(day) + 1) % dayPool.length;

    tripsPerDay.set(day, (tripsPerDay.get(day) ?? 0) + 1);
    trips.push({
      data: day,
      skad: baseName,
      dokad: route.nazwa,
      cel: route.cel,
      km: route.oneWayKm,
      zrodlo: "auto",
      wymagaWyboruCelu: false,
      locationId: route.locationId,
    });
    trips.push({
      data: day,
      skad: route.nazwa,
      dokad: baseName,
      cel: route.cel,
      km: route.oneWayKm,
      zrodlo: "auto",
      wymagaWyboruCelu: false,
      locationId: route.locationId,
    });
    remainingTenths -= pairTenths;
  }

  if (remainingTenths > 0) {
    const legsTenths = routes.map((r) => toTenths(r.oneWayKm));
    const combo = findExactCombination(legsTenths, remainingTenths, 3);
    if (combo && combo.length > 0) {
      const lastDay = dayPool[dayPool.length - 1];
      for (const legTenths of combo) {
        const route = routes.find((r) => toTenths(r.oneWayKm) === legTenths)!;
        trips.push({
          data: lastDay,
          skad: baseName,
          dokad: route.nazwa,
          cel: route.cel,
          km: route.oneWayKm,
          zrodlo: "auto",
          wymagaWyboruCelu: false,
          locationId: route.locationId,
        });
      }
      remainingTenths = 0;
    }
  }

  if (remainingTenths > 0) {
    const lastDay = allDays[allDays.length - 1];
    trips.push({
      data: lastDay,
      skad: baseName,
      dokad: "(do ustalenia)",
      cel: "WYMAGA WYBORU CELU",
      km: fromTenths(remainingTenths),
      zrodlo: "auto",
      wymagaWyboruCelu: true,
      locationId: null,
    });
    remainingTenths = 0;
  }

  return { trips, unresolvedKm: 0 };
}

function findDayWithCapacity(
  dayPool: string[],
  tripsPerDay: Map<string, number>,
  maxTripsPerDay: number,
  startCursor: number,
): string | null {
  for (let i = 0; i < dayPool.length; i++) {
    const day = dayPool[(startCursor + i) % dayPool.length];
    if ((tripsPerDay.get(day) ?? 0) < maxTripsPerDay) return day;
  }
  return null;
}
