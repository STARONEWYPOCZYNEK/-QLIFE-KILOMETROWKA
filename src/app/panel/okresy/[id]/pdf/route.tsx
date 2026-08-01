import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireUser } from "@/lib/auth/require-user";
import { getPeriodReport } from "@/lib/reports/get-period-report";
import { ReportDocument } from "@/lib/pdf/report-document";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await context.params;
  const report = await getPeriodReport(id);

  if (!report) {
    return new NextResponse("Nie znaleziono okresu", { status: 404 });
  }

  const doc = (
    <ReportDocument
      companyName={report.companyName}
      companyNip={report.companyNip}
      nrRejestracyjny={report.vehicle.nr_rejestracyjny}
      dataRozpoczeciaEwidencji={report.vehicle.data_rozpoczecia_uzytku}
      zakresOd={report.period.okres_od}
      zakresDo={report.period.okres_do}
      trips={report.trips}
      sumaKm={report.sumaKm}
      stanPoczatkowy={report.period.stan_poczatkowy}
      stanKoncowy={report.period.stan_koncowy}
      zatwierdzoneInfo={
        report.period.zatwierdzone_przez
          ? `Zatwierdzone przez ${report.period.zatwierdzone_przez} dnia ${report.period.data_zatwierdzenia ?? ""} (wersja ${report.period.wersja}).`
          : null
      }
    />
  );

  const buffer = await renderToBuffer(doc);
  const filename = `ewidencja-${report.period.okres_od}-${report.period.okres_do}-wersja${report.period.wersja}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
