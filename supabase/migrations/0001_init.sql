-- Ewidencja przebiegu pojazdu QLIFE sp. z o.o. — schemat wstępny

create table if not exists app_settings (
  id boolean primary key default true constraint app_settings_singleton check (id),
  base_location_name text not null default 'Kopernika 34',
  base_location_address text not null default 'Kopernika 34, 22-100 Chełm',
  workdays_only boolean not null default true,
  quarterly_vat_report boolean not null default false,
  reminder_email text not null default 'marek@dobrex.com.pl',
  accountant_email text not null default 'biuro@konceptum.pl'
);

insert into app_settings (id) values (true) on conflict (id) do nothing;

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  marka text not null default '',
  model text not null default '',
  nr_rejestracyjny text not null default '',
  vin text not null default '',
  data_rozpoczecia_uzytku date,
  aktywny boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  nazwa text not null,
  adres text not null,
  kategoria text not null,
  one_way_km numeric(6, 1) not null,
  km_potwierdzone boolean not null default false,
  dostepne_cele jsonb not null default '[]'::jsonb,
  domyslny_cel text not null default '',
  waga_czestotliwosci int not null default 1,
  aktywny boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists odometer_readings (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  data date not null,
  stan_km integer not null,
  typ text not null check (
    typ in ('rozpoczecie_ewidencji', 'koniec_miesiaca', 'koniec_kwartalu', 'zakonczenie_ewidencji')
  ),
  created_at timestamptz not null default now()
);

create table if not exists reporting_periods (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  okres_od date not null,
  okres_do date not null,
  stan_poczatkowy integer not null,
  stan_koncowy integer,
  inne_wyjazdy_zapytane boolean not null default false,
  status text not null default 'szkic' check (status in ('szkic', 'wygenerowany', 'zatwierdzony')),
  wersja int not null default 1,
  zatwierdzone_przez text,
  data_zatwierdzenia timestamptz,
  tekst_potwierdzenia text,
  created_at timestamptz not null default now(),
  unique (vehicle_id, okres_od, okres_do, wersja)
);

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  reporting_period_id uuid not null references reporting_periods (id) on delete cascade,
  numer_wpisu int not null,
  data date not null,
  skad text not null,
  dokad text not null,
  cel text not null,
  km numeric(6, 1) not null,
  kierowca text not null default 'Marek Dąbrowski',
  zrodlo text not null default 'auto' check (zrodlo in ('auto', 'reczny')),
  wymaga_wyboru_celu boolean not null default false,
  location_id uuid references locations (id),
  created_at timestamptz not null default now(),
  unique (reporting_period_id, numer_wpisu)
);

alter table app_settings enable row level security;
alter table vehicles enable row level security;
alter table locations enable row level security;
alter table odometer_readings enable row level security;
alter table reporting_periods enable row level security;
alter table trips enable row level security;

create policy "authenticated_all" on app_settings for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_all" on vehicles for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_all" on locations for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_all" on odometer_readings for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_all" on reporting_periods for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_all" on trips for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
