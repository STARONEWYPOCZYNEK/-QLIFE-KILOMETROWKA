"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateAutoTrips } from "@/lib/trips/engine";
import { locationsToRouteOptions } from "@/lib/locations/route-options";
import { getPeriodTrips, renumberTrips, sumTripsKm } from "@/lib/periods/service";
import { DRIVER, TEKST_ZATWIERDZENIA } from "@/lib/company";
import type { AppSettingsRow, LocationRow, ReportingPeriodRow } from "@/lib/data/types";

type ActionResult = { error: string } | { success: true };

/** Tymczasowe, gwarantowane unikalne w obrębie jednego inserta numery — renumberTrips ustawia właściwe zaraz potem. */
const PLACEHOLDER_NUMER_WPISU_BASE = 1_000_000;

function revalidate(periodId: string) {
  revalidatePath(`/panel/okresy/${periodId}`);
  revalidatePath("/panel/okresy");
  revalidatePath("/panel");
}

export async function recordOtherTripsAnswer(periodId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reporting_periods")
    .update({ inne_wyjazdy_zapytane: true })
    .eq("id", periodId);
  if (error) return { error: "Nie udało się zapisać odpowiedzi" };
  revalidate(periodId);
  return { success: true };
}

export interface ManualTripInput {
  data: string;
  skad: string;
  dokad: string;
  cel: string;
  km: number;
}

export async function addManualTrip(periodId: string, input: ManualTripInput): Promise<ActionResult> {
  if (!input.data || !input.skad.trim() || !input.dokad.trim() || !input.cel.trim()) {
    return { error: "Uzupełnij datę, skąd, dokąd i cel wyjazdu" };
  }
  if (!Number.isFinite(input.km) || input.km <= 0) {
    return { error: "Liczba kilometrów musi być większa od zera" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("trips").insert({
    reporting_period_id: periodId,
    numer_wpisu: 999999,
    data: input.data,
    skad: input.skad.trim(),
    dokad: input.dokad.trim(),
    cel: input.cel.trim(),
    km: input.km,
    kierowca: DRIVER.imieNazwisko,
    zrodlo: "reczny",
    wymaga_wyboru_celu: false,
  });

  if (error) return { error: "Nie udało się dodać wyjazdu" };

  await renumberTrips(supabase, periodId);
  revalidate(periodId);
  return { success: true };
}

export interface TripUpdateInput {
  data: string;
  skad: string;
  dokad: string;
  cel: string;
  km: number;
}

export async function updateTrip(
  periodId: string,
  tripId: string,
  input: TripUpdateInput,
): Promise<ActionResult> {
  if (!input.data || !input.skad.trim() || !input.dokad.trim() || !input.cel.trim()) {
    return { error: "Uzupełnij datę, skąd, dokąd i cel wyjazdu" };
  }
  if (!Number.isFinite(input.km) || input.km <= 0) {
    return { error: "Liczba kilometrów musi być większa od zera" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("trips")
    .update({
      data: input.data,
      skad: input.skad.trim(),
      dokad: input.dokad.trim(),
      cel: input.cel.trim(),
      km: input.km,
      wymaga_wyboru_celu: false,
    })
    .eq("id", tripId);

  if (error) return { error: "Nie udało się zapisać zmian" };

  await renumberTrips(supabase, periodId);
  revalidate(periodId);
  return { success: true };
}

export async function deleteTrip(periodId: string, tripId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("trips").delete().eq("id", tripId);
  if (error) return { error: "Nie udało się usunąć wpisu" };

  await renumberTrips(supabase, periodId);
  revalidate(periodId);
  return { success: true };
}

async function loadActiveRoutes(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: locations } = await supabase
    .from("locations")
    .select("*")
    .eq("aktywny", true)
    .returns<LocationRow[]>();
  return locationsToRouteOptions(locations ?? []);
}

async function loadSettings(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.from("app_settings").select("*").single<AppSettingsRow>();
  return data!;
}

export async function recordEndOdometerAndGenerate(periodId: string, endKm: number): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: period } = await supabase
    .from("reporting_periods")
    .select("*")
    .eq("id", periodId)
    .single<ReportingPeriodRow>();

  if (!period) return { error: "Nie znaleziono okresu" };
  if (endKm <= period.stan_poczatkowy) {
    return { error: "Stan końcowy musi być większy od stanu początkowego" };
  }

  const settings = await loadSettings(supabase);
  const existingTrips = await getPeriodTrips(supabase, periodId);
  const manualKm = sumTripsKm(existingTrips);
  const targetKm = Math.round((endKm - period.stan_poczatkowy - manualKm) * 10) / 10;

  const routes = await loadActiveRoutes(supabase);
  const occupiedDates = existingTrips.map((t) => t.data);

  const { trips: generated } = generateAutoTrips({
    periodStart: period.okres_od,
    periodEnd: period.okres_do,
    targetKm,
    routes,
    baseName: settings.base_location_name,
    workdaysOnly: settings.workdays_only,
    occupiedDates,
  });

  if (generated.length > 0) {
    const { error: insertError } = await supabase.from("trips").insert(
      generated.map((t, index) => ({
        reporting_period_id: periodId,
        numer_wpisu: PLACEHOLDER_NUMER_WPISU_BASE + index,
        data: t.data,
        skad: t.skad,
        dokad: t.dokad,
        cel: t.cel,
        km: t.km,
        kierowca: DRIVER.imieNazwisko,
        zrodlo: t.zrodlo,
        wymaga_wyboru_celu: t.wymagaWyboruCelu,
        location_id: t.locationId,
      })),
    );
    if (insertError) return { error: "Nie udało się zapisać automatycznie rozpisanych przejazdów" };
  }

  await renumberTrips(supabase, periodId);

  const { error: updateError } = await supabase
    .from("reporting_periods")
    .update({ stan_koncowy: endKm, status: "wygenerowany" })
    .eq("id", periodId);
  if (updateError) return { error: "Nie udało się zapisać stanu licznika" };

  await supabase.from("odometer_readings").insert({
    vehicle_id: period.vehicle_id,
    data: period.okres_do,
    stan_km: endKm,
    typ: "koniec_miesiaca",
  });

  revalidate(periodId);
  return { success: true };
}

export async function addExtraAutoFill(periodId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: period } = await supabase
    .from("reporting_periods")
    .select("*")
    .eq("id", periodId)
    .single<ReportingPeriodRow>();

  if (!period || period.stan_koncowy === null) return { error: "Brak zapisanego stanu końcowego" };

  const existingTrips = await getPeriodTrips(supabase, periodId);
  const currentSum = sumTripsKm(existingTrips);
  const remaining = Math.round((period.stan_koncowy - period.stan_poczatkowy - currentSum) * 10) / 10;

  if (remaining <= 0) return { error: "Suma wpisów już odpowiada stanowi licznika — nie ma czego dopisać" };

  const settings = await loadSettings(supabase);
  const routes = await loadActiveRoutes(supabase);
  const occupiedDates = existingTrips.map((t) => t.data);

  const { trips: generated } = generateAutoTrips({
    periodStart: period.okres_od,
    periodEnd: period.okres_do,
    targetKm: remaining,
    routes,
    baseName: settings.base_location_name,
    workdaysOnly: settings.workdays_only,
    occupiedDates,
  });

  if (generated.length === 0) return { error: "Nie udało się dopasować pozostałych kilometrów" };

  const { error } = await supabase.from("trips").insert(
    generated.map((t, index) => ({
      reporting_period_id: periodId,
      numer_wpisu: PLACEHOLDER_NUMER_WPISU_BASE + index,
      data: t.data,
      skad: t.skad,
      dokad: t.dokad,
      cel: t.cel,
      km: t.km,
      kierowca: DRIVER.imieNazwisko,
      zrodlo: t.zrodlo,
      wymaga_wyboru_celu: t.wymagaWyboruCelu,
      location_id: t.locationId,
    })),
  );
  if (error) return { error: "Nie udało się dopisać wpisów" };

  await renumberTrips(supabase, periodId);
  revalidate(periodId);
  return { success: true };
}

export async function approvePeriod(periodId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: period } = await supabase
    .from("reporting_periods")
    .select("*")
    .eq("id", periodId)
    .single<ReportingPeriodRow>();
  if (!period || period.stan_koncowy === null) return { error: "Brak zapisanego stanu końcowego" };

  const trips = await getPeriodTrips(supabase, periodId);
  if (trips.length === 0) return { error: "Okres nie ma jeszcze żadnych wpisów" };
  if (trips.some((t) => t.wymaga_wyboru_celu)) {
    return { error: "Uzupełnij cel dla wpisów oznaczonych „WYMAGA WYBORU CELU” przed zatwierdzeniem" };
  }

  const sum = sumTripsKm(trips);
  const expected = Math.round((period.stan_koncowy - period.stan_poczatkowy) * 10) / 10;
  if (Math.abs(sum - expected) > 0.05) {
    return { error: `Suma wpisów (${sum} km) nie zgadza się z różnicą stanu licznika (${expected} km)` };
  }

  const { error } = await supabase
    .from("reporting_periods")
    .update({
      status: "zatwierdzony",
      zatwierdzone_przez: `${DRIVER.imieNazwisko}, ${DRIVER.stanowisko}`,
      data_zatwierdzenia: new Date().toISOString(),
      tekst_potwierdzenia: TEKST_ZATWIERDZENIA,
    })
    .eq("id", periodId);

  if (error) return { error: "Nie udało się zatwierdzić okresu" };

  revalidate(periodId);
  return { success: true };
}

export async function reopenForCorrection(periodId: string): Promise<{ error: string } | { newPeriodId: string }> {
  const supabase = await createClient();

  const { data: period } = await supabase
    .from("reporting_periods")
    .select("*")
    .eq("id", periodId)
    .single<ReportingPeriodRow>();
  if (!period) return { error: "Nie znaleziono okresu" };
  if (period.status !== "zatwierdzony") return { error: "Można korygować tylko zatwierdzony okres" };

  const trips = await getPeriodTrips(supabase, periodId);

  const { data: newPeriod, error: insertError } = await supabase
    .from("reporting_periods")
    .insert({
      vehicle_id: period.vehicle_id,
      okres_od: period.okres_od,
      okres_do: period.okres_do,
      stan_poczatkowy: period.stan_poczatkowy,
      stan_koncowy: period.stan_koncowy,
      inne_wyjazdy_zapytane: true,
      status: "wygenerowany",
      wersja: period.wersja + 1,
    })
    .select("id")
    .single();

  if (insertError || !newPeriod) return { error: "Nie udało się utworzyć korekty" };

  if (trips.length > 0) {
    const { error: tripsError } = await supabase.from("trips").insert(
      trips.map((t) => ({
        reporting_period_id: newPeriod.id,
        numer_wpisu: t.numer_wpisu,
        data: t.data,
        skad: t.skad,
        dokad: t.dokad,
        cel: t.cel,
        km: t.km,
        kierowca: t.kierowca,
        zrodlo: t.zrodlo,
        wymaga_wyboru_celu: t.wymaga_wyboru_celu,
        location_id: t.location_id,
      })),
    );
    if (tripsError) return { error: "Nie udało się skopiować wpisów do korekty" };
  }

  revalidatePath("/panel/okresy");
  revalidatePath("/panel");
  return { newPeriodId: newPeriod.id };
}
