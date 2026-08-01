import { createClient } from "@/lib/supabase/server";
import type { VehicleRow } from "@/lib/data/types";
import { PojazdForm } from "./pojazd-form";

export default async function PojazdPage() {
  const supabase = await createClient();
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("*")
    .eq("aktywny", true)
    .maybeSingle<VehicleRow>();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Konfiguracja pojazdu</h1>
      <p className="text-gray-600">Jednorazowa konfiguracja — dane pojazdu używanego wyłącznie służbowo.</p>
      <PojazdForm vehicle={vehicle ?? null} />
    </div>
  );
}
