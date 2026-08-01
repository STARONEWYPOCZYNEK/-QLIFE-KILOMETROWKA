import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPeriodTrips } from "@/lib/periods/service";
import type { LocationRow, ReportingPeriodRow } from "@/lib/data/types";
import { OkresClient } from "./okres-client";

export default async function OkresPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: period } = await supabase
    .from("reporting_periods")
    .select("*")
    .eq("id", id)
    .maybeSingle<ReportingPeriodRow>();

  if (!period) notFound();

  const trips = await getPeriodTrips(supabase, id);
  const { data: locations } = await supabase
    .from("locations")
    .select("*")
    .eq("aktywny", true)
    .order("waga_czestotliwosci", { ascending: false })
    .returns<LocationRow[]>();

  return <OkresClient period={period} trips={trips} locations={locations ?? []} />;
}
