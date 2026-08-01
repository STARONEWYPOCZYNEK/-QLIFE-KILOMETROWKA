"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { OdometerReadingRow, ReportingPeriodRow } from "@/lib/data/types";
import { startLedger, startNextPeriod } from "./dashboard-actions";

const STATUS_LABELS: Record<ReportingPeriodRow["status"], string> = {
  szkic: "Szkic — w trakcie uzupełniania",
  wygenerowany: "Wygenerowany — do przejrzenia i zatwierdzenia",
  zatwierdzony: "Zatwierdzony",
};

export function DashboardClient({
  vehicleId,
  ledgerStart,
  latestPeriod,
  dataRozpoczeciaUzytku,
  todayIsLastDayOfMonth,
}: {
  vehicleId: string;
  ledgerStart: OdometerReadingRow | null;
  latestPeriod: ReportingPeriodRow | null;
  dataRozpoczeciaUzytku: string | null;
  todayIsLastDayOfMonth: boolean;
}) {
  const [startKm, setStartKm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!ledgerStart) {
    if (!dataRozpoczeciaUzytku) {
      return (
        <p className="text-gray-600">
          Uzupełnij datę rozpoczęcia wyłącznego użytku firmowego w{" "}
          <Link href="/panel/pojazd" className="underline">
            konfiguracji pojazdu
          </Link>
          .
        </p>
      );
    }

    function submit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);
      startTransition(async () => {
        const result = await startLedger(vehicleId, dataRozpoczeciaUzytku!, Number(startKm));
        if (result && "error" in result) setError(result.error);
      });
    }

    return (
      <form onSubmit={submit} className="flex max-w-sm flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="font-semibold">Rozpoczęcie ewidencji</h2>
        <p className="text-sm text-gray-600">
          Podaj stan licznika na dzień {dataRozpoczeciaUzytku} — dzień rozpoczęcia wyłącznego użytku
          firmowego pojazdu.
        </p>
        <label className="flex flex-col gap-1">
          <span className="font-medium">Stan licznika (km)</span>
          <input
            value={startKm}
            onChange={(e) => setStartKm(e.target.value)}
            inputMode="numeric"
            className="h-11 rounded-lg border border-gray-300 px-3"
            required
          />
        </label>
        {error && <p className="font-medium text-red-600">{error}</p>}
        <button type="submit" disabled={isPending} className="btn-big bg-blue-600 text-white disabled:opacity-50">
          {isPending ? "Zapisywanie…" : "Rozpocznij ewidencję"}
        </button>
      </form>
    );
  }

  if (!latestPeriod) {
    return <p className="text-gray-600">Brak aktywnego okresu ewidencji — skontaktuj się z administratorem.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="font-semibold">
          Bieżący okres: {latestPeriod.okres_od} – {latestPeriod.okres_do}
        </h2>
        <p className="text-gray-600">{STATUS_LABELS[latestPeriod.status]}</p>
        <Link href={`/panel/okresy/${latestPeriod.id}`} className="mt-3 inline-block underline">
          Przejdź do okresu →
        </Link>
      </div>

      {latestPeriod.status === "zatwierdzony" && (
        <NextPeriodButton vehicleId={vehicleId} previousPeriodId={latestPeriod.id} />
      )}

      {todayIsLastDayOfMonth && latestPeriod.stan_koncowy === null && (
        <p className="rounded-lg bg-blue-50 p-3 font-medium text-blue-800">
          To ostatni dzień miesiąca — pamiętaj o wpisaniu stanu licznika w bieżącym okresie.
        </p>
      )}
    </div>
  );
}

function NextPeriodButton({ vehicleId, previousPeriodId }: { vehicleId: string; previousPeriodId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function start() {
    setError(null);
    startTransition(async () => {
      const result = await startNextPeriod(vehicleId, previousPeriodId);
      if (result && "error" in result) setError(result.error);
    });
  }

  return (
    <div>
      <button onClick={start} disabled={isPending} className="btn-big bg-blue-600 text-white disabled:opacity-50">
        {isPending ? "Tworzenie…" : "Rozpocznij kolejny miesiąc"}
      </button>
      {error && <p className="mt-2 font-medium text-red-600">{error}</p>}
    </div>
  );
}
