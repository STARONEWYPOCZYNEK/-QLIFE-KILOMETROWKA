"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { firstPeriodRange, nextPeriodRange } from "@/lib/periods/continuity";

type ActionResult = { error: string };

export async function startLedger(
  vehicleId: string,
  startDate: string,
  startKm: number,
): Promise<ActionResult | never> {
  if (!Number.isFinite(startKm) || startKm < 0) {
    return { error: "Podaj poprawny stan licznika" };
  }

  const supabase = await createClient();

  const { error: readingError } = await supabase.from("odometer_readings").insert({
    vehicle_id: vehicleId,
    data: startDate,
    stan_km: startKm,
    typ: "rozpoczecie_ewidencji",
  });
  if (readingError) return { error: "Nie udało się zapisać stanu licznika" };

  const range = firstPeriodRange(startDate);
  const { data: period, error: periodError } = await supabase
    .from("reporting_periods")
    .insert({
      vehicle_id: vehicleId,
      okres_od: range.okresOd,
      okres_do: range.okresDo,
      stan_poczatkowy: startKm,
      status: "szkic",
      wersja: 1,
    })
    .select("id")
    .single();

  if (periodError || !period) return { error: "Nie udało się utworzyć pierwszego okresu ewidencji" };

  redirect(`/panel/okresy/${period.id}`);
}

export async function startNextPeriod(
  vehicleId: string,
  previousPeriodId: string,
): Promise<ActionResult | never> {
  const supabase = await createClient();

  const { data: previous } = await supabase
    .from("reporting_periods")
    .select("okres_do, stan_koncowy")
    .eq("id", previousPeriodId)
    .single();

  if (!previous || previous.stan_koncowy === null) {
    return { error: "Poprzedni okres nie ma jeszcze zapisanego stanu końcowego licznika" };
  }

  const range = nextPeriodRange(previous.okres_do);
  const { data: period, error } = await supabase
    .from("reporting_periods")
    .insert({
      vehicle_id: vehicleId,
      okres_od: range.okresOd,
      okres_do: range.okresDo,
      stan_poczatkowy: previous.stan_koncowy,
      status: "szkic",
      wersja: 1,
    })
    .select("id")
    .single();

  if (error || !period) return { error: "Nie udało się utworzyć kolejnego okresu" };

  redirect(`/panel/okresy/${period.id}`);
}
