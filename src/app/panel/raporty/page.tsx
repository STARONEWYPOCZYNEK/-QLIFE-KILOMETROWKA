import Link from "next/link";
import { getRangeReport } from "@/lib/reports/get-range-report";
import { PRESET_LABELS, presetRange, type PresetKey } from "@/lib/periods/presets";
import { todayIso } from "@/lib/periods/continuity";

export default async function RaportyPage({
  searchParams,
}: {
  searchParams: Promise<{ od?: string; do?: string }>;
}) {
  const params = await searchParams;
  const today = todayIso();
  const od = params.od ?? presetRange("miesiac", today).od;
  const doDate = params.do ?? presetRange("miesiac", today).do;

  const report = await getRangeReport(od, doDate);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Raporty</h1>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(PRESET_LABELS) as PresetKey[]).map((key) => {
          const range = presetRange(key, today);
          return (
            <Link
              key={key}
              href={`/panel/raporty?od=${range.od}&do=${range.do}`}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              {PRESET_LABELS[key]}
            </Link>
          );
        })}
      </div>

      <form className="flex flex-wrap items-end gap-2" action="/panel/raporty">
        <label className="flex flex-col gap-1 text-sm">
          <span>Od</span>
          <input type="date" name="od" defaultValue={od} className="h-9 rounded border border-gray-300 px-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Do</span>
          <input type="date" name="do" defaultValue={doDate} className="h-9 rounded border border-gray-300 px-2" />
        </label>
        <button type="submit" className="h-9 rounded-lg bg-blue-600 px-4 font-medium text-white">
          Pokaż
        </button>
      </form>

      {!report ? (
        <p className="text-gray-600">Skonfiguruj pojazd, żeby zobaczyć raporty.</p>
      ) : (
        <>
          <div className="flex gap-4">
            <a href={`/panel/raporty/pdf?od=${od}&do=${doDate}`} className="underline">
              Pobierz PDF
            </a>
            <a href={`/panel/raporty/csv?od=${od}&do=${doDate}`} className="underline">
              Pobierz CSV
            </a>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Skąd</th>
                <th>Dokąd</th>
                <th>Cel</th>
                <th>Km</th>
                <th>Kierowca</th>
              </tr>
            </thead>
            <tbody>
              {report.trips.map((t) => (
                <tr key={t.id}>
                  <td>{t.data}</td>
                  <td>{t.skad}</td>
                  <td>{t.dokad}</td>
                  <td>{t.cel}</td>
                  <td>{t.km}</td>
                  <td>{t.kierowca}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="font-semibold">Suma: {report.sumaKm} km</p>
        </>
      )}
    </div>
  );
}
