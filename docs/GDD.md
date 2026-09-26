# Pokój 100 — opis gry (GDD)

## W jednym zdaniu
Horrorowy escape room na telefon: 100 zamkniętych pokoi, każdy trudniejszy, w dziesięciu coraz bardziej przerażających miejscach.

## Dla kogo
Fani gier „ucieczka z pokoju” i lekkiego horroru (13+). Sesje 3–30 minut na pokój, bez refleksu, za to z myśleniem.

## Pętla rozgrywki
1. Rozglądasz się: 4 ściany, strzałki lub przesunięcie palcem.
2. Stukasz meble: otwierają się, przybliżają albo są zamknięte (kłódka, szyfr, łańcuch, deski, śrubki, sznur, prąd).
3. Zbierasz przedmioty (klucze, narzędzia, kartki, bezpieczniki, lampę UV, baterie) i łączysz je w ekwipunku.
4. Szukasz szyfrów: zegar, krwawe napisy, tablica, obraz z symbolami, ponumerowane świece, telewizor, kartki.
5. Otwierasz wszystkie zamki w drzwiach i uciekasz do następnego pokoju.

## Generator poziomów (`src/gen/level.ts`)
Poziom N powstaje z ziarna N, więc zawsze jest taki sam. Generator zaczyna od drzwi:
- drzwi mają 1 zamek (poziomy 1–4), 2 (5–19), 3 (20–49) albo 4 (50+);
- każdy zamek czegoś wymaga: **klucza**, **kodu**, **narzędzia** (młotek → deski, śrubokręt → kratka, nożyce → łańcuch, nóż → sznur),
  **prądu** (skrzynka z bezpiecznikami, minigra „zapal wszystkie”) albo **układanki**;
- to, czego wymaga, jest schowane w meblu, który sam może być zamknięty — i tak dalej, aż do głębokości 1–8;
- kody dostają wskazówki coraz mniej wprost:

| Od poziomu | Nowość |
|---|---|
| 1 | klucz, kartka z kodem |
| 3 | kod napisany krwią na ścianie |
| 6 | zegar (godzina = kod), klawiatura |
| 10 | kłódka z literami (słowo) |
| 12 | cyfry słowami, szkatułki z układanką |
| 14 | kłódka z symbolami |
| 15 | kod podzielony na części I, II, III w różnych miejscach |
| 18 | prąd i zamki elektroniczne |
| 20 | cyfry rzymskie, kolorowy zamek (świece z numerami, obrazy) |
| 26 | napisy widoczne tylko w świetle lampy UV |
| 30 | kostki do gry, słowa czytane od tyłu |
| 35 | działania matematyczne |
| 40 | lustrzane napisy, symbole z numerami kolejności |
| 45 | telewizor pokazujący kod po przywróceniu prądu, akrostych |
| 55 | szyfr symboli z kluczem na osobnej kartce |

Dodatkowo: ciemne poziomy (co piąty od 8.) zaczynają się od szukania latarki i baterii; od poziomu 11 są
fałszywe schowki, od 40 bezużyteczne przedmioty w ekwipunku. Każdy krok ma 3 podpowiedzi, a test
automatyczny przechodzi wszystkie 100 poziomów.

## Klimat
Mgła, zacieki i pęknięcia na ścianach, migająca żarówka (czasem gaśnie), krwawe napisy („UCIEKAJ”, „ZA TOBĄ”),
lalki obracające głowę, manekiny, bujany fotel, który sam się buja, szepty, pukanie w rurach, kapanie wody,
niskie buczenie w tle i fałszywe dźwięki pianina. Straszaki przy otwieraniu niektórych mebli: cień stojący w pokoju
przez ułamek sekundy, trzask i wstrząs, zgaśnięcie światła. Można je wyłączyć w ustawieniach; na starcie gra pokazuje ostrzeżenie.

## Zarabianie
Wszystko za darmo, ale z czasem gra wymaga dużo cierpliwości — skróty są płatne:

| | Za darmo | Za pieniądze |
|---|---|---|
| 💡 Podpowiedzi | 3 na start, 1 co 20 min, 1 za reklamę (co 3 min, max 15/dzień), nagroda dzienna, 40 🪙 | paczki 5 / 20 / 60 |
| ⏭️ Pominięcie poziomu | 5 💡 | — |
| Reklamy | pełnoekranowe rzadko, tylko między poziomami | „Bez reklam” lub pakiet przetrwania (20 💡 + bez reklam) |

Bez skrzynek z losową zawartością.

## Roadmapa
1. Zapis w chmurze (Google Play Games), osiągnięcia.
2. Tryb „Koszmar”: te same 100 poziomów z limitem czasu i częstszymi straszakami.
3. Codzienny pokój (dodatkowy poziom z ziarnem = data) z rankingiem czasów.
4. Więcej typów zagadek: rury do obracania, wagi, radio z częstotliwością, szyfr Morse'a (pukanie).
5. Fabuła: kartki z pamiętnika rozrzucone po 100 pokojach, które łączą się w historię.
