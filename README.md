# Ewidencja przebiegu pojazdu — QLIFE sp. z o.o.

Aplikacja do prowadzenia ewidencji przebiegu pojazdu (kilometrówki) dla celów VAT.
Sama proponuje wpisy na podstawie różnicy wskazań licznika i stałej listy
najczęstszych tras służbowych — Twoja rola to: konfiguracja pojazdu, wpisanie
stanu licznika na koniec miesiąca, ewentualne dopisanie nietypowych wyjazdów i
zatwierdzenie raportu.

## Pierwsze kroki

1. Zaloguj się (e-mail + kod jednorazowy wysyłany na Twoją skrzynkę).
2. **Pojazd** — uzupełnij markę, model, numer rejestracyjny, VIN i datę
   rozpoczęcia wyłącznego użytku firmowego.
3. **Miejsca** — sprawdź wstępnie oszacowane odległości (oznaczone jako
   „SZACUNEK”) i popraw je wg realnych km z Google Maps. Możesz też dodać nowe
   miejsce, które pojawia się częściej.
4. Na pulpicie wpisz stan licznika na dzień rozpoczęcia — rozpocznie to
   ciągłą ewidencję.

## Co miesiąc

1. Na koniec miesiąca dostaniesz e-mail z przypomnieniem.
2. Otwórz bieżący okres, odpowiedz czy były inne wyjazdy służbowe (jeśli tak —
   dopisz je ręcznie).
3. Wpisz stan licznika na koniec miesiąca — aplikacja automatycznie rozpisze
   resztę kilometrów na najczęstsze trasy.
4. Sprawdź listę wpisów. Jeśli któryś jest oznaczony „WYMAGA WYBORU CELU”,
   uzupełnij go ręcznie (edytuj wpis).
5. Zatwierdź ewidencję — potwierdzasz autentyczność wpisów.
6. Pobierz PDF/CSV i wyślij je do księgowości (biuro@konceptum.pl).

Zatwierdzony miesiąc można później otworzyć „do korekty” — poprzednia wersja
zostaje zapisana w historii.

## Stos technologiczny

Next.js 16 (App Router) + TypeScript + Tailwind 4 + Supabase (Postgres/Auth) +
Vercel + `@react-pdf/renderer` + `exceljs` + Resend. Zob. `AGENTS.md` —
uwaga na różnice względem starszego Next.js.
