import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireUser } from "@/lib/auth/require-user";
import { getRangeReport } from "@/lib/reports/get-range-report";
import { ReportDocument } from "@/lib/pdf/report-document";

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

  const doc = (
    <ReportDocument
      companyName={report.companyName}
      companyNip={report.companyNip}
      nrRejestracyjny={report.vehicle.nr_rejestracyjny}
      dataRozpoczeciaEwidencji={report.vehicle.data_rozpoczecia_uzytku}
      zakresOd={report.zakresOd}
      zakresDo={report.zakresDo}
      trips={report.trips}
      sumaKm={report.sumaKm}
      stanPoczatkowy={null}
      stanKoncowy={null}
    />
  );

  const buffer = await renderToBuffer(doc);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="raport-${od}-${doDate}.pdf"`,
    },
  });
}
