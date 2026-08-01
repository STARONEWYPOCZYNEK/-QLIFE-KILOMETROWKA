import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLastDayOfMonth, todayIso } from "@/lib/periods/continuity";
import { getActiveVehicle, getLatestPeriod } from "@/lib/periods/service";
import { sendEmail } from "@/lib/email/resend";
import type { AppSettingsRow } from "@/lib/data/types";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const today = todayIso();
  if (!isLastDayOfMonth(today)) {
    return NextResponse.json({ skipped: "not last day of month" });
  }

  const supabase = createAdminClient();
  const vehicle = await getActiveVehicle(supabase);
  if (!vehicle) {
    return NextResponse.json({ skipped: "no active vehicle" });
  }

  const latestPeriod = await getLatestPeriod(supabase, vehicle.id);
  if (!latestPeriod || latestPeriod.stan_koncowy !== null) {
    return NextResponse.json({ skipped: "no open period or already recorded" });
  }

  const { data: settings } = await supabase.from("app_settings").select("*").single<AppSettingsRow>();
  const reminderEmail = settings?.reminder_email ?? "marek@dobrex.com.pl";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const result = await sendEmail(
    reminderEmail,
    "Ewidencja przebiegu pojazdu — wpisz stan licznika",
    `To ostatni dzień miesiąca (${today}). Wpisz stan licznika na koniec okresu ${latestPeriod.okres_od} – ${latestPeriod.okres_do}, żeby aplikacja mogła rozpisać przejazdy.\n\n${appUrl}/panel/okresy/${latestPeriod.id}`,
  );

  return NextResponse.json({ sent: result.success, error: result.error });
}
