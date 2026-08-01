-- Słownik najczęstszych miejsc z briefu QLIFE.
-- UWAGA: one_way_km to WSTĘPNE SZACUNKI (km_potwierdzone = false) — do sprawdzenia
-- i poprawienia przez Marka w Ustawienia > Miejsca (np. wg Google Maps), zanim
-- zaczną być używane przez silnik auto-rozpisywania w miesiącach produkcyjnych.

insert into locations (nazwa, adres, kategoria, one_way_km, km_potwierdzone, dostepne_cele, domyslny_cel, waga_czestotliwosci) values
(
  'Strupin Duży 93',
  'Strupin Duży 93, 22-100 Chełm',
  'inwestycja',
  6.0,
  false,
  '["Nadzór i koordynacja robót budowlanych – zadanie inwestycyjne nr 1."]'::jsonb,
  'Nadzór i koordynacja robót budowlanych – zadanie inwestycyjne nr 1.',
  5
),
(
  'Włodawska 7 (myjnia Polmax)',
  'Włodawska 7, 22-100 Chełm',
  'myjnia',
  3.0,
  false,
  '["Czynności związane z działalnością QLIFE sp. z o.o. oraz udziałem spółki w Polmax s.c."]'::jsonb,
  'Czynności związane z działalnością QLIFE sp. z o.o. oraz udziałem spółki w Polmax s.c.',
  5
),
(
  'Lwowska 105 (hurtownia Perfekt)',
  'Lwowska 105, 22-100 Chełm',
  'hurtownia',
  4.0,
  false,
  '["Zakup lub odbiór materiałów dla inwestycji Zacisze Strupin Duży"]'::jsonb,
  'Zakup lub odbiór materiałów dla inwestycji Zacisze Strupin Duży',
  3
),
(
  'Lubelska 11 (bank WBK)',
  'Lubelska 11, 22-100 Chełm',
  'bank',
  3.0,
  false,
  '["Obsługa spraw finansowych i bankowych QLIFE sp. z o.o."]'::jsonb,
  'Obsługa spraw finansowych i bankowych QLIFE sp. z o.o.',
  2
),
(
  'Lwowska 8 (bank Erste)',
  'Lwowska 8, 22-100 Chełm',
  'bank',
  3.0,
  false,
  '["Obsługa spraw finansowych i bankowych QLIFE sp. z o.o."]'::jsonb,
  'Obsługa spraw finansowych i bankowych QLIFE sp. z o.o.',
  2
),
(
  'Hrubieszowska 54 (hurtownia sanitarna)',
  'Hrubieszowska 54, 22-100 Chełm',
  'hurtownia',
  4.0,
  false,
  '["Zakup lub odbiór materiałów dla inwestycji Zacisze Strupin Duży"]'::jsonb,
  'Zakup lub odbiór materiałów dla inwestycji Zacisze Strupin Duży',
  3
),
(
  'Rampa Brzeska 16 (hurtownia elektryczna Kwant)',
  'Rampa Brzeska 16, 22-100 Chełm',
  'hurtownia',
  4.0,
  false,
  '["Zakup lub odbiór materiałów dla inwestycji Zacisze Strupin Duży"]'::jsonb,
  'Zakup lub odbiór materiałów dla inwestycji Zacisze Strupin Duży',
  3
),
(
  'Warszawa (Radzymińska 12/60)',
  'Radzymińska 12/60, 03-752 Warszawa',
  'warszawa',
  245.0,
  false,
  '["Podpisanie dokumentów", "Spotkanie dotyczące inwestycji", "Spotkanie dotyczące finansowania"]'::jsonb,
  'Spotkanie dotyczące inwestycji',
  1
),
(
  'Nerta Polska, Kostrzyn',
  'Krajowa 3, 62-025 Kostrzyn',
  'nerta',
  490.0,
  false,
  '["Spotkanie handlowe", "Odbiór towaru", "Szkolenie produktowe", "Rozmowy dotyczące współpracy"]'::jsonb,
  'Spotkanie handlowe',
  1
),
(
  'LR Health & Beauty, Katowice',
  'Hutnicza 6, 40-241 Katowice',
  'lr',
  360.0,
  false,
  '["Szkolenie produktowe", "Wydarzenie sprzedażowe", "Spotkanie partnerów", "Rozwój działalności handlowej"]'::jsonb,
  'Szkolenie produktowe',
  1
);
