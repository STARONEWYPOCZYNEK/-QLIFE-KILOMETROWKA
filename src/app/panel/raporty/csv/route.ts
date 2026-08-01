import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { requireUser } from "@/lib/auth/require-user";
import { getRangeReport } from "@/lib/reports/get-range-report";

export async function GET(request: NextRequest) {
  await requireUser();
  const { searchParams } = new URL(request.url);
  const od = searchParams.get("od");
  const doDate = searchParams.get("do");

  if (!od || !doDate) {
    return new NextResponse("Podaj zakres dat (od, do)", { status: 400 });
  }

  const report = await getRangeReport(od, doDate);
  if (!report) {
    return new NextResponse("Brak skonfigurowanego pojazdu", { status: 404 });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Raport");
  sheet.columns = [{ width: 12 }, { width: 24 }, { width: 24 }, { width: 40 }, { width: 10 }, { width: 20 }];

  sheet.addRow([`${report.companyName} · NIP ${report.companyNip}`]);
  sheet.addRow([`Zakres: ${report.zakresOd} – ${report.zakresDo}`]);
  sheet.addRow([]);

  const headerRow = sheet.addRow(["Data", "Skąd", "Dokąd", "Cel", "Km", "Kierowca"]);
  headerRow.font = { bold: true };

  for (const t of report.trips) {
    sheet.addRow([t.data, t.skad, t.dokad, t.cel, Number(t.km), t.kierowca]);
  }

  sheet.addRow([]);
  const totalRow = sheet.addRow(["", "", "", "Razem", report.sumaKm]);
  totalRow.font = { bold: true };

  const buffer = await workbook.csv.writeBuffer();
  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="raport-${od}-${doDate}.csv"`,
    },
  });
}
