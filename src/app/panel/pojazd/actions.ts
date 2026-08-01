"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface VehicleInput {
  marka: string;
  model: string;
  nrRejestracyjny: string;
  vin: string;
  dataRozpoczeciaUzytku: string;
}

type ActionResult = { error: string } | { success: true };

export async function saveVehicle(vehicleId: string | null, input: VehicleInput): Promise<ActionResult> {
  if (!input.marka.trim() || !input.model.trim() || !input.nrRejestracyjny.trim()) {
    return { error: "Marka, model i numer rejestracyjny są wymagane" };
  }
  if (!input.dataRozpoczeciaUzytku) {
    return { error: "Podaj datę rozpoczęcia wyłącznego użytku firmowego" };
  }

  const supabase = await createClient();

  const payload = {
    marka: input.marka.trim(),
    model: input.model.trim(),
    nr_rejestracyjny: input.nrRejestracyjny.trim().toUpperCase(),
    vin: input.vin.trim().toUpperCase(),
    data_rozpoczecia_uzytku: input.dataRozpoczeciaUzytku,
    aktywny: true,
  };

  const { error } = vehicleId
    ? await supabase.from("vehicles").update(payload).eq("id", vehicleId)
    : await supabase.from("vehicles").insert(payload);

  if (error) return { error: "Nie udało się zapisać danych pojazdu" };

  revalidatePath("/panel/pojazd");
  revalidatePath("/panel");
  return { success: true };
}
