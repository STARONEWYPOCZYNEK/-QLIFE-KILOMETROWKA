"use client";

import { useState, useTransition } from "react";
import type { LocationRow } from "@/lib/data/types";
import { addLocation, setLocationActive, updateLocationDistance } from "./actions";

function LocationRowEditor({ location }: { location: LocationRow }) {
  const [km, setKm] = useState(String(location.one_way_km));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateLocationDistance(location.id, Number(km));
      if ("error" in result) setError(result.error);
    });
  }

  function toggleActive() {
    startTransition(async () => {
      await setLocationActive(location.id, !location.aktywny);
    });
  }

  return (
    <tr>
      <td>
        <div className="font-medium">{location.nazwa}</div>
        <div className="text-sm text-gray-500">{location.adres}</div>
      </td>
      <td>
        <div className="flex items-center gap-2">
          <input
            value={km}
            onChange={(e) => setKm(e.target.value)}
            onBlur={save}
            className="h-9 w-20 rounded border border-gray-300 px-2"
            inputMode="decimal"
          />
          <span>km (w jedną stronę)</span>
        </div>
        {location.km_potwierdzone ? (
          <span className="text-sm text-green-700">potwierdzone</span>
        ) : (
          <span className="text-sm text-amber-600">SZACUNEK — sprawdź i zapisz, żeby potwierdzić</span>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </td>
      <td>{location.waga_czestotliwosci}</td>
      <td>
        <button
          type="button"
          onClick={toggleActive}
          disabled={isPending}
          className="underline disabled:opacity-50"
        >
          {location.aktywny ? "Wyłącz" : "Włącz"}
        </button>
      </td>
    </tr>
  );
}

function NewLocationForm() {
  const [nazwa, setNazwa] = useState("");
  const [adres, setAdres] = useState("");
  const [km, setKm] = useState("");
  const [cel, setCel] = useState("");
  const [waga, setWaga] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addLocation({
        nazwa,
        adres,
        oneWayKm: Number(km),
        domyslnyCel: cel,
        wagaCzestotliwosci: Number(waga) || 1,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setNazwa("");
      setAdres("");
      setKm("");
      setCel("");
      setWaga("1");
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="font-semibold">Dodaj nowe miejsce</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Nazwa</span>
          <input value={nazwa} onChange={(e) => setNazwa(e.target.value)} className="h-10 rounded border border-gray-300 px-2" required />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Adres</span>
          <input value={adres} onChange={(e) => setAdres(e.target.value)} className="h-10 rounded border border-gray-300 px-2" required />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Odległość w jedną stronę (km)</span>
          <input value={km} onChange={(e) => setKm(e.target.value)} className="h-10 rounded border border-gray-300 px-2" inputMode="decimal" required />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Waga częstotliwości (1 = rzadko, 5 = bardzo często)</span>
          <input value={waga} onChange={(e) => setWaga(e.target.value)} className="h-10 rounded border border-gray-300 px-2" inputMode="numeric" />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-sm font-medium">Domyślny cel wyjazdu</span>
          <input value={cel} onChange={(e) => setCel(e.target.value)} className="h-10 rounded border border-gray-300 px-2" required />
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={isPending} className="btn-big self-start bg-blue-600 text-white disabled:opacity-50">
        {isPending ? "Dodawanie…" : "Dodaj miejsce"}
      </button>
    </form>
  );
}

export function MiejscaClient({ locations }: { locations: LocationRow[] }) {
  return (
    <div className="flex flex-col gap-6">
      <table className="data-table">
        <thead>
          <tr>
            <th>Miejsce</th>
            <th>Odległość</th>
            <th>Waga</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {locations.map((loc) => (
            <LocationRowEditor key={loc.id} location={loc} />
          ))}
        </tbody>
      </table>
      <NewLocationForm />
    </div>
  );
}
