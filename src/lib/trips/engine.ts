export interface RouteOption {
  locationId: string;
  nazwa: string;
  cel: string;
  oneWayKm: number;
  waga: number;
  /**
   * 1 = codzienna trasa (myjnia/budowa),
   * 2 = eskalacja gdy codzienne trasy nie pokryją miesiąca (Warszawa),
   * 3 = sporadyczne lokalne (hurtownie/banki),
   * 4 = rzadkie dalekie (LR/Nerta) — dobierane na samym końcu.
   */
  tier: 1 | 2 | 3 | 4;
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
  /** Gdy true (domyślnie): pon-sob, wyklucza tylko niedzielę. */
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

/** Trasy dłuższe niż to (w jedną stronę) traktowane są jako "dalekie wyjazdy" — wymagają odstępu między sobą. */
const LONG_TRIP_KM_THRESHOLD = 50;
/** Minimalny odstęp kalendarzowy między dwoma dalekimi wyjazdami — nierealne robić Warszawę/Nertę/LR co drugi dzień. */
const LONG_TRIP_MIN_GAP_DAYS = 7;

function toTenths(km: number): number {
  return Math.round(km * KM_SCALE);
}

function fromTenths(tenths: number): number {
  return tenths / KM_SCALE;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(`${aIso}T00:00:00Z`).getTime();
  const b = new Date(`${bIso}T00:00:00Z`).getTime();
  return Math.abs(a - b) / 86_400_000;
}

/** workdaysOnly=true wyklucza tylko niedzielę (pon-sob to dni z dojazdami) — zgodnie z realnym wzorcem QLIFE. */
export function businessDaysInRange(startIso: string, endIso: string, workdaysOnly = true): string[] {
  const start = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  const days: string[] = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dayOfWeek = d.getUTCDay(); // 0 = niedziela
    if (workdaysOnly && dayOfWeek === 0) continue;
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

interface DayConstraint {
  counts: Map<string, number>;
  cap: number;
}

function findDayWithCapacity(
  dayPool: string[],
  constraints: DayConstraint[],
  extraFilter: ((day: string) => boolean) | null,
  startCursor: number,
): string | null {
  for (let i = 0; i < dayPool.length; i++) {
    const day = dayPool[(startCursor + i) % dayPool.length];
    if (extraFilter && !extraFilter(day)) continue;
    if (constraints.every((c) => (c.counts.get(day) ?? 0) < c.cap)) return day;
  }
  return null;
}

interface FillState {
  trips: GeneratedTripDraft[];
  remainingTenths: number;
  overallCounts: Map<string, number>;
  tier1Counts: Map<string, number>;
  /** Data ostatniego zaplanowanego dalekiego wyjazdu (Warszawa/LR/Nerta) — wymuszamy odstęp od niej. */
  lastLongTripDate: string | null;
}

/**
 * Wypełnia jedną warstwę priorytetu aż zabraknie miejsca w dniach albo reszta będzie za mała.
 * Warstwa 1 (codzienne dojazdy myjnia/budowa) jest dodatkowo ograniczona do jednego przejazdu
 * dziennie — inaczej sama zajęłaby wszystkie dostępne "sloty" w dniach, nie zostawiając miejsca
 * na eskalację do Warszawy/hurtowni gdy cel jest duży. Warstwy z dalekimi trasami (>50 km w jedną
 * stronę) dodatkowo wymagają co najmniej tygodnia odstępu od poprzedniego dalekiego wyjazdu — i
 * rezerwują cały dzień wyłącznie dla siebie, żeby nie mieszać dalekiej podróży z lokalnymi sprawami.
 */
function fillTier(
  state: FillState,
  tierRoutes: RouteOption[],
  dayPool: string[],
  baseName: string,
  maxTripsPerDay: number,
  isDailyTier: boolean,
  tier1RouteNames: Set<string>,
  rng: () => number,
): void {
  if (tierRoutes.length === 0 || dayPool.length === 0) return;

  const isLongTier = tierRoutes.some((r) => r.oneWayKm > LONG_TRIP_KM_THRESHOLD);
  const constraints: DayConstraint[] = [{ counts: state.overallCounts, cap: maxTripsPerDay }];
  if (isDailyTier) constraints.push({ counts: state.tier1Counts, cap: 1 });

  const longTripFilter = isLongTier
    ? (day: string) => !state.lastLongTripDate || daysBetween(day, state.lastLongTripDate) >= LONG_TRIP_MIN_GAP_DAYS
    : null;

  const smallestPairTenths = Math.min(...tierRoutes.map((r) => toTenths(r.oneWayKm) * 2));
  const guardLimit = dayPool.length * maxTripsPerDay + 200;
  let guard = 0;
  let dayCursor = 0;

  while (state.remainingTenths >= smallestPairTenths && guard < guardLimit) {
    guard += 1;
    const route = pickWeighted(tierRoutes, rng);
    const pairTenths = toTenths(route.oneWayKm) * 2;
    if (pairTenths > state.remainingTenths) continue;

    const day = findDayWithCapacity(dayPool, constraints, longTripFilter, dayCursor);
    if (!day) break; // wszystkie dni w tej warstwie osiągnęły limit (lub odstęp od dalekiego wyjazdu) — kolejna warstwa
    dayCursor = (dayPool.indexOf(day) + 1) % dayPool.length;

    if (isLongTier && (state.tier1Counts.get(day) ?? 0) > 0) {
      // Warstwa 1 już zajęła ten dzień lokalnym wyjazdem — daleki wyjazd go przejmuje,
      // żeby nie mieszać podróży do Warszawy/LR/Nerty z dojazdem do myjni tego samego dnia.
      // Zwracamy km usuniętych wpisów do puli, żeby suma nadal zgadzała się z celem.
      const evicted = state.trips.filter(
        (t) => t.data === day && (tier1RouteNames.has(t.dokad) || tier1RouteNames.has(t.skad)),
      );
      state.trips = state.trips.filter((t) => !evicted.includes(t));
      state.remainingTenths += evicted.reduce((sum, t) => sum + toTenths(t.km), 0);
      state.tier1Counts.set(day, 0);
      state.overallCounts.set(day, (state.overallCounts.get(day) ?? 0) - evicted.length);
    }

    state.overallCounts.set(day, (state.overallCounts.get(day) ?? 0) + 1);
    if (isDailyTier) state.tier1Counts.set(day, (state.tier1Counts.get(day) ?? 0) + 1);
    if (isLongTier) {
      state.lastLongTripDate = day;
      state.overallCounts.set(day, maxTripsPerDay); // cały dzień zarezerwowany na daleki wyjazd
    }
    state.trips.push({
      data: day,
      skad: baseName,
      dokad: route.nazwa,
      cel: route.cel,
      km: route.oneWayKm,
      zrodlo: "auto",
      wymagaWyboruCelu: false,
      locationId: route.locationId,
    });
    state.trips.push({
      data: day,
      skad: route.nazwa,
      dokad: baseName,
      cel: route.cel,
      km: route.oneWayKm,
      zrodlo: "auto",
      wymagaWyboruCelu: false,
      locationId: route.locationId,
    });
    state.remainingTenths -= pairTenths;
  }
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

  const state: FillState = {
    trips: [],
    remainingTenths: toTenths(targetKm),
    overallCounts: new Map(),
    tier1Counts: new Map(),
    lastLongTripDate: null,
  };
  if (state.remainingTenths <= 0 || routes.length === 0) {
    return { trips: state.trips, unresolvedKm: fromTenths(Math.max(state.remainingTenths, 0)) };
  }

  const allDays = businessDaysInRange(periodStart, periodEnd, workdaysOnly);
  if (allDays.length === 0) {
    return { trips: state.trips, unresolvedKm: fromTenths(state.remainingTenths) };
  }

  const freeDays = allDays.filter((d) => !occupiedDates.includes(d));
  const dayPool = freeDays.length > 0 ? freeDays : allDays;

  const tier1 = routes.filter((r) => r.tier === 1);
  const tier2 = routes.filter((r) => r.tier === 2);
  const tier3 = routes.filter((r) => r.tier === 3);
  const tier4 = routes.filter((r) => r.tier === 4);
  const tier1RouteNames = new Set(tier1.map((r) => r.nazwa));

  fillTier(state, tier1, dayPool, baseName, maxTripsPerDay, true, tier1RouteNames, rng);
  fillTier(state, tier2, dayPool, baseName, maxTripsPerDay, false, tier1RouteNames, rng);
  fillTier(state, tier3, dayPool, baseName, maxTripsPerDay, false, tier1RouteNames, rng);
  fillTier(state, tier4, dayPool, baseName, maxTripsPerDay, false, tier1RouteNames, rng);

  if (state.remainingTenths > 0) {
    const legsTenths = routes.map((r) => toTenths(r.oneWayKm));
    const combo = findExactCombination(legsTenths, state.remainingTenths, 3);
    if (combo && combo.length > 0) {
      const lastDay = dayPool[dayPool.length - 1];
      for (const legTenths of combo) {
        const route = routes.find((r) => toTenths(r.oneWayKm) === legTenths)!;
        state.trips.push({
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
      state.remainingTenths = 0;
    }
  }

  if (state.remainingTenths > 0) {
    const lastDay = allDays[allDays.length - 1];
    state.trips.push({
      data: lastDay,
      skad: baseName,
      dokad: "(do ustalenia)",
      cel: "WYMAGA WYBORU CELU",
      km: fromTenths(state.remainingTenths),
      zrodlo: "auto",
      wymagaWyboruCelu: true,
      locationId: null,
    });
    state.remainingTenths = 0;
  }

  return { trips: state.trips, unresolvedKm: 0 };
}
