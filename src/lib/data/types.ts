export interface AppSettingsRow {
  base_location_name: string;
  base_location_address: string;
  workdays_only: boolean;
  quarterly_vat_report: boolean;
  reminder_email: string;
  accountant_email: string;
}

export interface VehicleRow {
  id: string;
  marka: string;
  model: string;
  nr_rejestracyjny: string;
  vin: string;
  data_rozpoczecia_uzytku: string | null;
  aktywny: boolean;
}

export interface LocationRow {
  id: string;
  nazwa: string;
  adres: string;
  kategoria: string;
  one_way_km: number;
  km_potwierdzone: boolean;
  dostepne_cele: string[];
  domyslny_cel: string;
  waga_czestotliwosci: number;
  aktywny: boolean;
}

export type OdometerType =
  | "rozpoczecie_ewidencji"
  | "koniec_miesiaca"
  | "koniec_kwartalu"
  | "zakonczenie_ewidencji";

export interface OdometerReadingRow {
  id: string;
  vehicle_id: string;
  data: string;
  stan_km: number;
  typ: OdometerType;
}

export type PeriodStatus = "szkic" | "wygenerowany" | "zatwierdzony";

export interface ReportingPeriodRow {
  id: string;
  vehicle_id: string;
  okres_od: string;
  okres_do: string;
  stan_poczatkowy: number;
  stan_koncowy: number | null;
  inne_wyjazdy_zapytane: boolean;
  status: PeriodStatus;
  wersja: number;
  zatwierdzone_przez: string | null;
  data_zatwierdzenia: string | null;
  tekst_potwierdzenia: string | null;
}

export interface TripRow {
  id: string;
  reporting_period_id: string;
  numer_wpisu: number;
  data: string;
  skad: string;
  dokad: string;
  cel: string;
  km: number;
  kierowca: string;
  zrodlo: "auto" | "reczny";
  wymaga_wyboru_celu: boolean;
  location_id: string | null;
}
