import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { requireUser } from "@/lib/auth/require-user";
import { getPeriodReport } from "@/lib/reports/get-period-report";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await context.params;
  const report = await getPeriodReport(id);

  if (!report) {
    return new NextResponse("Nie znaleziono okresu", { status: 404 });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Ewidencja");

  sheet.columns = [
    { width: 6 },
    { width: 12 },
    { width: 24 },
    { width: 24 },
    { width: 40 },
    { width: 10 },
    { width: 20 },
  ];

  sheet.addRow([`${report.companyName} · NIP ${report.companyNip}`]);
  sheet.addRow([`Numer rejestracyjny: ${report.vehicle.nr_rejestracyjny}`]);
  sheet.addRow([`Zakres: ${report.period.okres_od} – ${report.period.okres_do}`]);
  sheet.addRow([
    `Stan licznika: ${report.period.stan_poczatkowy} -> ${report.period.stan_koncowy ?? "-"}`,
  ]);
  sheet.addRow([]);

  const headerRow = sheet.addRow(["Nr", "Data", "Skąd", "Dokąd", "Cel", "Km", "Kierowca"]);
  headerRow.font = { bold: true };

  for (const t of report.trips) {
    sheet.addRow([t.numer_wpisu, t.data, t.skad, t.dokad, t.cel, Number(t.km), t.kierowca]);
  }

  sheet.addRow([]);
  const totalRow = sheet.addRow(["", "", "", "", "Razem", report.sumaKm]);
  totalRow.font = { bold: true };

  const buffer = await workbook.csv.writeBuffer();
  const filename = `ewidencja-${report.period.okres_od}-${report.period.okres_do}-wersja${report.period.wersja}.csv`;

  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
