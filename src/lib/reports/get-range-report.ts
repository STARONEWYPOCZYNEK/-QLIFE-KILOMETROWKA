import { createClient } from "@/lib/supabase/server";
import { getActiveVehicle, listLatestPeriodsPerRange, sumTripsKm } from "@/lib/periods/service";
import { COMPANY } from "@/lib/company";
import type { TripRow, VehicleRow } from "@/lib/data/types";

export interface RangeReport {
  vehicle: VehicleRow;
  trips: TripRow[];
  sumaKm: number;
  companyName: string;
  companyNip: string;
  zakresOd: string;
  zakresDo: string;
}

export async function getRangeReport(zakresOd: string, zakresDo: string): Promise<RangeReport | null> {
  const supabase = await createClient();
  const vehicle = await getActiveVehicle(supabase);
  if (!vehicle) return null;

  const periods = await listLatestPeriodsPerRange(supabase, vehicle.id);
  const relevantPeriodIds = periods
    .filter((p) => p.okres_od <= zakresDo && p.okres_do >= zakresOd)
    .map((p) => p.id);

  if (relevantPeriodIds.length === 0) {
    return { vehicle, trips: [], sumaKm: 0, companyName: COMPANY.nazwa, companyNip: COMPANY.nip, zakresOd, zakresDo };
  }

  const { data: trips } = await supabase
    .from("trips")
    .select("*")
    .in("reporting_period_id", relevantPeriodIds)
    .gte("data", zakresOd)
    .lte("data", zakresDo)
    .order("data", { ascending: true })
    .returns<TripRow[]>();

  return {
    vehicle,
    trips: trips ?? [],
    sumaKm: sumTripsKm(trips ?? []),
    companyName: COMPANY.nazwa,
    companyNip: COMPANY.nip,
    zakresOd,
    zakresDo,
  };
}
