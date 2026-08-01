"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string } | { success: true };

export async function updateLocationDistance(
  locationId: string,
  oneWayKm: number,
): Promise<ActionResult> {
  if (!Number.isFinite(oneWayKm) || oneWayKm <= 0) {
    return { error: "Odległość musi być liczbą większą od zera" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("locations")
    .update({ one_way_km: oneWayKm, km_potwierdzone: true })
    .eq("id", locationId);

  if (error) return { error: "Nie udało się zapisać odległości" };

  revalidatePath("/panel/miejsca");
  return { success: true };
}

export async function setLocationActive(locationId: string, aktywny: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("locations").update({ aktywny }).eq("id", locationId);

  if (error) return { error: "Nie udało się zapisać zmiany" };

  revalidatePath("/panel/miejsca");
  return { success: true };
}

export interface NewLocationInput {
  nazwa: string;
  adres: string;
  oneWayKm: number;
  domyslnyCel: string;
  wagaCzestotliwosci: number;
}

export async function addLocation(input: NewLocationInput): Promise<ActionResult> {
  if (!input.nazwa.trim() || !input.adres.trim() || !input.domyslnyCel.trim()) {
    return { error: "Nazwa, adres i cel są wymagane" };
  }
  if (!Number.isFinite(input.oneWayKm) || input.oneWayKm <= 0) {
    return { error: "Odległość musi być liczbą większą od zera" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("locations").insert({
    nazwa: input.nazwa.trim(),
    adres: input.adres.trim(),
    kategoria: "inne",
    one_way_km: input.oneWayKm,
    km_potwierdzone: true,
    dostepne_cele: [input.domyslnyCel.trim()],
    domyslny_cel: input.domyslnyCel.trim(),
    waga_czestotliwosci: input.wagaCzestotliwosci,
    aktywny: true,
  });

  if (error) return { error: "Nie udało się dodać miejsca" };

  revalidatePath("/panel/miejsca");
  return { success: true };
}
