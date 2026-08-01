import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveVehicle, listLatestPeriodsPerRange } from "@/lib/periods/service";

const STATUS_LABELS: Record<string, string> = {
  szkic: "Szkic",
  wygenerowany: "Do zatwierdzenia",
  zatwierdzony: "Zatwierdzony",
};

export default async function OkresyPage() {
  const supabase = await createClient();
  const vehicle = await getActiveVehicle(supabase);
  const periods = vehicle ? await listLatestPeriodsPerRange(supabase, vehicle.id) : [];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Okresy ewidencji</h1>
      <table className="data-table">
        <thead>
          <tr>
            <th>Okres</th>
            <th>Status</th>
            <th>Stan licznika</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {periods.map((p) => (
            <tr key={p.id}>
              <td>
                {p.okres_od} – {p.okres_do}
                {p.wersja > 1 && <span className="text-gray-500"> (wersja {p.wersja})</span>}
              </td>
              <td>{STATUS_LABELS[p.status]}</td>
              <td>
                {p.stan_poczatkowy} → {p.stan_koncowy ?? "—"}
              </td>
              <td>
                <Link href={`/panel/okresy/${p.id}`} className="underline">
                  Otwórz
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {periods.length === 0 && <p className="text-gray-600">Brak okresów ewidencji.</p>}
    </div>
  );
}
