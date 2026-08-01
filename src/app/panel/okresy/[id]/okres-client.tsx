"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LocationRow, ReportingPeriodRow, TripRow } from "@/lib/data/types";
import { TEKST_ZATWIERDZENIA } from "@/lib/company";
import {
  addExtraAutoFill,
  addManualTrip,
  approvePeriod,
  deleteTrip,
  recordEndOdometerAndGenerate,
  recordOtherTripsAnswer,
  reopenForCorrection,
  updateTrip,
} from "./actions";

function sumKm(trips: TripRow[]): number {
  return Math.round(trips.reduce((sum, t) => sum + Number(t.km), 0) * 10) / 10;
}

export function OkresClient({
  period,
  trips,
  locations,
}: {
  period: ReportingPeriodRow;
  trips: TripRow[];
  locations: LocationRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const suma = sumKm(trips);
  const cel = period.stan_koncowy !== null ? period.stan_koncowy - period.stan_poczatkowy : null;

  function withPending(fn: () => Promise<{ error: string } | { success: true } | void>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result && "error" in result) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">
          Okres {period.okres_od} – {period.okres_do}
          {period.wersja > 1 && <span className="ml-2 text-base font-normal text-gray-500">(wersja {period.wersja})</span>}
        </h1>
        <p className="text-gray-600">Stan początkowy: {period.stan_poczatkowy} km</p>
      </div>

      {error && <p className="font-medium text-red-600">{error}</p>}

      {!period.inne_wyjazdy_zapytane && period.status === "szkic" && (
        <InnyWyjazdPytanie
          periodId={period.id}
          onAnswered={() => withPending(() => recordOtherTripsAnswer(period.id))}
        />
      )}

      {period.inne_wyjazdy_zapytane && period.stan_koncowy === null && (
        <>
          <ManualTripForm periodId={period.id} locations={locations} onDone={() => router.refresh()} />
          <TripsTable
            trips={trips}
            locations={locations}
            editable
            onDelete={(id) => withPending(() => deleteTrip(period.id, id))}
            onUpdate={(id, input) => withPending(() => updateTrip(period.id, id, input))}
          />
          <EndOdometerForm
            periodId={period.id}
            minKm={period.stan_poczatkowy}
            isPending={isPending}
            onSubmit={(km) => withPending(() => recordEndOdometerAndGenerate(period.id, km))}
          />
        </>
      )}

      {period.stan_koncowy !== null && (
        <>
          <p className="text-gray-700">
            Stan końcowy: {period.stan_koncowy} km · Cel: {cel} km · Suma wpisów:{" "}
            <span className={Math.abs(suma - (cel ?? 0)) > 0.05 ? "font-bold text-red-600" : "font-bold text-green-700"}>
              {suma} km
            </span>
          </p>

          {period.status !== "zatwierdzony" && (
            <TripsTable
              trips={trips}
              locations={locations}
              editable
              onDelete={(id) => withPending(() => deleteTrip(period.id, id))}
              onUpdate={(id, input) => withPending(() => updateTrip(period.id, id, input))}
            />
          )}
          {period.status === "zatwierdzony" && <TripsTable trips={trips} locations={locations} editable={false} />}

          {period.status !== "zatwierdzony" && (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => withPending(() => addExtraAutoFill(period.id))}
                disabled={isPending}
                className="btn-big bg-gray-200 disabled:opacity-50"
              >
                Dopisz automatycznie resztę
              </button>
              <ManualTripInline periodId={period.id} locations={locations} onDone={() => router.refresh()} />
            </div>
          )}

          {period.status === "wygenerowany" && (
            <ApproveBox isPending={isPending} onApprove={() => withPending(() => approvePeriod(period.id))} />
          )}

          {period.status === "zatwierdzony" && (
            <ZatwierdzonyBox periodId={period.id} period={period} />
          )}
        </>
      )}
    </div>
  );
}

function InnyWyjazdPytanie({ onAnswered }: { periodId: string; onAnswered: () => void }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="font-medium">Czy w tym miesiącu były inne wyjazdy służbowe poza najczęstszymi trasami?</p>
      <p className="mb-3 text-sm text-gray-600">
        Jeśli tak, dopisz je poniżej ręcznie zanim aplikacja rozpisze automatycznie resztę kilometrów.
      </p>
      <button onClick={onAnswered} className="btn-big bg-blue-600 text-white">
        Rozumiem, przejdź dalej
      </button>
    </div>
  );
}

function ManualTripForm({
  periodId,
  locations,
  onDone,
}: {
  periodId: string;
  locations: LocationRow[];
  onDone: () => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-2 font-semibold">Dodaj ręczny wyjazd służbowy (jeśli był)</h2>
      <ManualTripInline periodId={periodId} locations={locations} onDone={onDone} />
    </div>
  );
}

function ManualTripInline({
  periodId,
  locations,
  onDone,
}: {
  periodId: string;
  locations: LocationRow[];
  onDone: () => void;
}) {
  const [data, setData] = useState("");
  const [skad, setSkad] = useState("Kopernika 34");
  const [dokad, setDokad] = useState("");
  const [cel, setCelValue] = useState("");
  const [km, setKm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addManualTrip(periodId, { data, skad, dokad, cel, km: Number(km) });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setData("");
      setDokad("");
      setCelValue("");
      setKm("");
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span>Data</span>
        <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="h-9 rounded border border-gray-300 px-2" required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Skąd</span>
        <input value={skad} onChange={(e) => setSkad(e.target.value)} className="h-9 w-36 rounded border border-gray-300 px-2" required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Dokąd</span>
        <input
          value={dokad}
          onChange={(e) => setDokad(e.target.value)}
          list="lokalizacje"
          className="h-9 w-48 rounded border border-gray-300 px-2"
          required
        />
        <datalist id="lokalizacje">
          {locations.map((l) => (
            <option key={l.id} value={l.nazwa} />
          ))}
        </datalist>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Cel</span>
        <input value={cel} onChange={(e) => setCelValue(e.target.value)} className="h-9 w-56 rounded border border-gray-300 px-2" required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Km</span>
        <input value={km} onChange={(e) => setKm(e.target.value)} inputMode="decimal" className="h-9 w-20 rounded border border-gray-300 px-2" required />
      </label>
      <button type="submit" disabled={isPending} className="h-9 rounded-lg bg-blue-600 px-4 font-medium text-white disabled:opacity-50">
        {isPending ? "Dodawanie…" : "Dodaj"}
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}

function EndOdometerForm({
  minKm,
  isPending,
  onSubmit,
}: {
  periodId: string;
  minKm: number;
  isPending: boolean;
  onSubmit: (km: number) => void;
}) {
  const [km, setKm] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(Number(km));
      }}
      className="flex max-w-sm flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4"
    >
      <h2 className="font-semibold">Stan licznika na koniec okresu</h2>
      <label className="flex flex-col gap-1">
        <span>Stan licznika (km), więcej niż {minKm}</span>
        <input value={km} onChange={(e) => setKm(e.target.value)} inputMode="numeric" className="h-11 rounded-lg border border-gray-300 px-3" required />
      </label>
      <button type="submit" disabled={isPending} className="btn-big bg-blue-600 text-white disabled:opacity-50">
        {isPending ? "Rozpisywanie…" : "Zapisz i rozpisz automatycznie"}
      </button>
    </form>
  );
}

function TripsTable({
  trips,
  locations,
  editable,
  onDelete,
  onUpdate,
}: {
  trips: TripRow[];
  locations: LocationRow[];
  editable: boolean;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, input: { data: string; skad: string; dokad: string; cel: string; km: number }) => void;
}) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Nr</th>
          <th>Data</th>
          <th>Skąd</th>
          <th>Dokąd</th>
          <th>Cel</th>
          <th>Km</th>
          <th>Kierowca</th>
          {editable && <th></th>}
        </tr>
      </thead>
      <tbody>
        {trips.map((t) => (
          <TripRowView key={t.id} trip={t} locations={locations} editable={editable} onDelete={onDelete} onUpdate={onUpdate} />
        ))}
      </tbody>
    </table>
  );
}

function TripRowView({
  trip,
  editable,
  onDelete,
  onUpdate,
}: {
  trip: TripRow;
  locations: LocationRow[];
  editable: boolean;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, input: { data: string; skad: string; dokad: string; cel: string; km: number }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState(trip.data);
  const [skad, setSkad] = useState(trip.skad);
  const [dokad, setDokad] = useState(trip.dokad);
  const [cel, setCelValue] = useState(trip.cel);
  const [km, setKm] = useState(String(trip.km));

  if (editing) {
    return (
      <tr>
        <td>{trip.numer_wpisu}</td>
        <td><input type="date" value={data} onChange={(e) => setData(e.target.value)} className="h-8 rounded border border-gray-300 px-1" /></td>
        <td><input value={skad} onChange={(e) => setSkad(e.target.value)} className="h-8 w-28 rounded border border-gray-300 px-1" /></td>
        <td><input value={dokad} onChange={(e) => setDokad(e.target.value)} className="h-8 w-28 rounded border border-gray-300 px-1" /></td>
        <td><input value={cel} onChange={(e) => setCelValue(e.target.value)} className="h-8 w-40 rounded border border-gray-300 px-1" /></td>
        <td><input value={km} onChange={(e) => setKm(e.target.value)} inputMode="decimal" className="h-8 w-16 rounded border border-gray-300 px-1" /></td>
        <td>{trip.kierowca}</td>
        <td className="flex gap-2">
          <button
            className="text-blue-700 underline"
            onClick={() => {
              onUpdate?.(trip.id, { data, skad, dokad, cel, km: Number(km) });
              setEditing(false);
            }}
          >
            Zapisz
          </button>
          <button className="text-gray-500 underline" onClick={() => setEditing(false)}>
            Anuluj
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className={trip.wymaga_wyboru_celu ? "bg-amber-50" : undefined}>
      <td>{trip.numer_wpisu}</td>
      <td>{trip.data}</td>
      <td>{trip.skad}</td>
      <td>{trip.dokad}</td>
      <td>{trip.cel}</td>
      <td>{trip.km}</td>
      <td>{trip.kierowca}</td>
      {editable && (
        <td className="flex gap-2">
          <button className="text-blue-700 underline" onClick={() => setEditing(true)}>
            Edytuj
          </button>
          <button className="text-red-700 underline" onClick={() => onDelete?.(trip.id)}>
            Usuń
          </button>
        </td>
      )}
    </tr>
  );
}

function ApproveBox({ isPending, onApprove }: { isPending: boolean; onApprove: () => void }) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <label className="flex items-start gap-2">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1" />
        <span>{TEKST_ZATWIERDZENIA}</span>
      </label>
      <button
        onClick={onApprove}
        disabled={!confirmed || isPending}
        className="btn-big mt-3 bg-green-700 text-white disabled:opacity-50"
      >
        {isPending ? "Zatwierdzanie…" : "Zatwierdź ewidencję"}
      </button>
    </div>
  );
}

function ZatwierdzonyBox({ periodId, period }: { periodId: string; period: ReportingPeriodRow }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function correct() {
    setError(null);
    startTransition(async () => {
      const result = await reopenForCorrection(periodId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push(`/panel/okresy/${result.newPeriodId}`);
    });
  }

  return (
    <div className="rounded-lg border border-green-300 bg-green-50 p-4">
      <p className="font-medium text-green-800">
        Zatwierdzone przez {period.zatwierdzone_przez} dnia{" "}
        {period.data_zatwierdzenia && new Date(period.data_zatwierdzenia).toLocaleString("pl-PL")} (wersja {period.wersja})
      </p>
      <div className="mt-3 flex flex-wrap gap-4">
        <Link href={`/panel/okresy/${periodId}/pdf`} className="underline">
          Pobierz PDF
        </Link>
        <Link href={`/panel/okresy/${periodId}/csv`} className="underline">
          Pobierz CSV
        </Link>
        <button onClick={correct} disabled={isPending} className="underline disabled:opacity-50">
          {isPending ? "Otwieranie…" : "Otwórz do korekty"}
        </button>
      </div>
      {error && <p className="mt-2 font-medium text-red-600">{error}</p>}
    </div>
  );
}
