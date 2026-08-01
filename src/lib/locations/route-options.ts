import type { LocationRow } from "@/lib/data/types";
import type { RouteOption } from "@/lib/trips/engine";

export function locationsToRouteOptions(locations: LocationRow[]): RouteOption[] {
  return locations
    .filter((l) => l.aktywny)
    .map((l) => ({
      locationId: l.id,
      nazwa: l.nazwa,
      cel: l.domyslny_cel,
      oneWayKm: Number(l.one_way_km),
      waga: l.waga_czestotliwosci,
    }));
}
