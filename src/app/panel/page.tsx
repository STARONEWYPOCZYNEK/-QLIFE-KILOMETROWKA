import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveVehicle, getLatestPeriod, getLedgerStartReading } from "@/lib/periods/service";
import { isLastDayOfMonth, todayIso } from "@/lib/periods/continuity";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const vehicle = await getActiveVehicle(supabase);

  if (!vehicle) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold">Witaj</h1>
        <p className="text-gray-600">
          Zanim zaczniesz prowadzić ewidencję, skonfiguruj dane pojazdu.
        </p>
        <Link href="/panel/pojazd" className="btn-big self-start bg-blue-600 text-white">
          Skonfiguruj pojazd
        </Link>
      </div>
    );
  }

  const ledgerStart = await getLedgerStartReading(supabase, vehicle.id);
  const latestPeriod = ledgerStart ? await getLatestPeriod(supabase, vehicle.id) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">
          {vehicle.marka} {vehicle.model} — {vehicle.nr_rejestracyjny}
        </h1>
        <p className="text-gray-600">QLIFE sp. z o.o. — kierowca: Marek Dąbrowski</p>
      </div>

      <DashboardClient
        vehicleId={vehicle.id}
        ledgerStart={ledgerStart}
        latestPeriod={latestPeriod}
        dataRozpoczeciaUzytku={vehicle.data_rozpoczecia_uzytku}
        todayIsLastDayOfMonth={isLastDayOfMonth(todayIso())}
      />
    </div>
  );
}
