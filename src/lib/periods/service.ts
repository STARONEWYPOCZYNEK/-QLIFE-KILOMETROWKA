import type { SupabaseClient } from "@supabase/supabase-js";
import type { OdometerReadingRow, ReportingPeriodRow, TripRow, VehicleRow } from "@/lib/data/types";

export async function getActiveVehicle(supabase: SupabaseClient): Promise<VehicleRow | null> {
  const { data } = await supabase.from("vehicles").select("*").eq("aktywny", true).maybeSingle<VehicleRow>();
  return data ?? null;
}

export async function getLedgerStartReading(
  supabase: SupabaseClient,
  vehicleId: string,
): Promise<OdometerReadingRow | null> {
  const { data } = await supabase
    .from("odometer_readings")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .eq("typ", "rozpoczecie_ewidencji")
    .maybeSingle<OdometerReadingRow>();
  return data ?? null;
}

/** Najnowszy okres (najwyższa data_od, a przy korekcie — najwyższa wersja tego samego zakresu). */
export async function getLatestPeriod(
  supabase: SupabaseClient,
  vehicleId: string,
): Promise<ReportingPeriodRow | null> {
  const { data } = await supabase
    .from("reporting_periods")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("okres_od", { ascending: false })
    .order("wersja", { ascending: false })
    .limit(1)
    .maybeSingle<ReportingPeriodRow>();
  return data ?? null;
}

/** Lista okresów do widoku historii — tylko najnowsza wersja każdego zakresu dat. */
export async function listLatestPeriodsPerRange(
  supabase: SupabaseClient,
  vehicleId: string,
): Promise<ReportingPeriodRow[]> {
  const { data } = await supabase
    .from("reporting_periods")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("okres_od", { ascending: false })
    .order("wersja", { ascending: false })
    .returns<ReportingPeriodRow[]>();

  const seen = new Set<string>();
  const latestOnly: ReportingPeriodRow[] = [];
  for (const period of data ?? []) {
    const key = `${period.okres_od}_${period.okres_do}`;
    if (seen.has(key)) continue;
    seen.add(key);
    latestOnly.push(period);
  }
  return latestOnly;
}

export async function getPeriodTrips(supabase: SupabaseClient, periodId: string): Promise<TripRow[]> {
  const { data } = await supabase
    .from("trips")
    .select("*")
    .eq("reporting_period_id", periodId)
    .order("numer_wpisu", { ascending: true })
    .returns<TripRow[]>();
  return data ?? [];
}

/** Renumeruje wpisy 1..N chronologicznie (data, potem kolejność wstawienia) — bez przerw w numeracji. */
export async function renumberTrips(supabase: SupabaseClient, periodId: string): Promise<void> {
  const { data } = await supabase
    .from("trips")
    .select("id, data, created_at")
    .eq("reporting_period_id", periodId)
    .order("data", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<{ id: string; data: string; created_at: string }[]>();

  const rows = data ?? [];
  await Promise.all(
    rows.map((row, index) =>
      supabase.from("trips").update({ numer_wpisu: index + 1 }).eq("id", row.id),
    ),
  );
}

export function sumTripsKm(trips: TripRow[]): number {
  return Math.round(trips.reduce((sum, t) => sum + Number(t.km), 0) * 10) / 10;
}
