"use client";

import { useState, useTransition } from "react";
import type { VehicleRow } from "@/lib/data/types";
import { saveVehicle } from "./actions";

export function PojazdForm({ vehicle }: { vehicle: VehicleRow | null }) {
  const [marka, setMarka] = useState(vehicle?.marka ?? "");
  const [model, setModel] = useState(vehicle?.model ?? "");
  const [nrRej, setNrRej] = useState(vehicle?.nr_rejestracyjny ?? "");
  const [vin, setVin] = useState(vehicle?.vin ?? "");
  const [dataRozpoczecia, setDataRozpoczecia] = useState(vehicle?.data_rozpoczecia_uzytku ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveVehicle(vehicle?.id ?? null, {
        marka,
        model,
        nrRejestracyjny: nrRej,
        vin,
        dataRozpoczeciaUzytku: dataRozpoczecia,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <form onSubmit={submit} className="flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="font-medium">Marka</span>
        <input
          value={marka}
          onChange={(e) => setMarka(e.target.value)}
          className="h-11 rounded-lg border border-gray-300 px-3"
          required
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-medium">Model</span>
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="h-11 rounded-lg border border-gray-300 px-3"
          required
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-medium">Numer rejestracyjny</span>
        <input
          value={nrRej}
          onChange={(e) => setNrRej(e.target.value)}
          className="h-11 rounded-lg border border-gray-300 px-3"
          required
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-medium">Numer VIN</span>
        <input
          value={vin}
          onChange={(e) => setVin(e.target.value)}
          className="h-11 rounded-lg border border-gray-300 px-3"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-medium">Data rozpoczęcia wyłącznego użytku firmowego</span>
        <input
          type="date"
          value={dataRozpoczecia}
          onChange={(e) => setDataRozpoczecia(e.target.value)}
          className="h-11 rounded-lg border border-gray-300 px-3"
          required
        />
        <span className="text-sm text-gray-500">
          Od tego dnia rozpoczyna się ciągła ewidencja. Pierwszy raport obejmie okres od tej daty do
          końca danego miesiąca.
        </span>
      </label>

      {error && (
        <p className="font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
      {saved && <p className="font-medium text-green-700">Zapisano dane pojazdu.</p>}

      <button type="submit" disabled={isPending} className="btn-big bg-blue-600 text-white disabled:opacity-50">
        {isPending ? "Zapisywanie…" : "Zapisz pojazd"}
      </button>
    </form>
  );
}
