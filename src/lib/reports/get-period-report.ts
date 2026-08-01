import { createClient } from "@/lib/supabase/server";
import { getPeriodTrips, sumTripsKm } from "@/lib/periods/service";
import { COMPANY } from "@/lib/company";
import type { ReportingPeriodRow, TripRow, VehicleRow } from "@/lib/data/types";

export interface PeriodReport {
  period: ReportingPeriodRow;
  vehicle: VehicleRow;
  trips: TripRow[];
  sumaKm: number;
  companyName: string;
  companyNip: string;
}

export async function getPeriodReport(periodId: string): Promise<PeriodReport | null> {
  const supabase = await createClient();

  const { data: period } = await supabase
    .from("reporting_periods")
    .select("*")
    .eq("id", periodId)
    .maybeSingle<ReportingPeriodRow>();
  if (!period) return null;

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", period.vehicle_id)
    .maybeSingle<VehicleRow>();
  if (!vehicle) return null;

  const trips = await getPeriodTrips(supabase, periodId);

  return {
    period,
    vehicle,
    trips,
    sumaKm: sumTripsKm(trips),
    companyName: COMPANY.nazwa,
    companyNip: COMPANY.nip,
  };
}
