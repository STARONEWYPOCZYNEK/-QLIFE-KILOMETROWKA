import { createClient } from "@/lib/supabase/server";
import type { LocationRow } from "@/lib/data/types";
import { MiejscaClient } from "./miejsca-client";

export default async function MiejscaPage() {
  const supabase = await createClient();
  const { data: locations } = await supabase
    .from("locations")
    .select("*")
    .order("waga_czestotliwosci", { ascending: false })
    .returns<LocationRow[]>();

  const niepotwierdzone = (locations ?? []).filter((l) => !l.km_potwierdzone).length;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Miejsca i odległości</h1>
      <p className="text-gray-600">
        Odległości liczone w jedną stronę od punktu bazowego (Kopernika 34). Używane przez automatyczne
        rozpisywanie przejazdów.
      </p>
      {niepotwierdzone > 0 && (
        <p className="rounded-lg bg-amber-50 p-3 font-medium text-amber-800">
          {niepotwierdzone} miejsc ma wstępnie oszacowaną odległość — sprawdź w Google Maps i popraw jeśli
          trzeba, żeby ewidencja była maksymalnie dokładna.
        </p>
      )}
      <MiejscaClient locations={locations ?? []} />
    </div>
  );
}
