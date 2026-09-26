# Kocia Ucieczka — opis gry (GDD)

## Pomysł w jednym zdaniu
Klasyczna gra „ucieczka z pokoju” na telefon, w której zamiast samotnego zamknięcia masz towarzysza: kota Mruczka,
który jest częścią każdej zagadki. Szukasz przedmiotów, łączysz je, łamiesz szyfry i uciekasz z pokoju do pokoju.

## Dla kogo
Fani starych gier flash typu escape room, zagadek logicznych i kotów. Sesje po 5–20 minut na pokój,
bez presji czasu i bez refleksu. Gra ma być „do pomyślenia”, a nie „do klikania”.

## Pętla rozgrywki
1. Rozglądasz się: 4 ściany pokoju, przełączane strzałkami lub przesunięciem palca.
2. Stukasz meble: otwierają się, przybliżają albo coś mówią (dymek).
3. Zbierasz przedmioty do ekwipunku (prawa kolumna).
4. Używasz przedmiotów na obiektach (wybierz → stuknij cel) i łączysz je ze sobą (wybierz jeden → stuknij drugi).
5. Znajdujesz wskazówki (zegar, kartka, obraz, lustro, telewizor) i wpisujesz szyfr w kłódce lub minigrze.
6. Otwierasz drzwi i przechodzisz do następnego pokoju. Opcjonalnie szukasz ukrytej złotej rybki.

## Rola kota
W każdym pokoju Mruczek coś blokuje albo coś ma. Trzeba zrozumieć, czego chce:
śpi na kluczyku (przysmaki), pilnuje szafki (mleko do miski), leży w koszu na pranie (myszka),
drzemie na poduszce z pilotem (wędka z piórkiem), wygrzewa się pod lampą (zgaś światło),
utknął na belce z kluczykiem w pyszczku (tuńczyk). Stuknięcie kota = miauknięcie, mruczenie, serduszka.

## Rozdział 1 „Dom” (6 pokoi)

| # | Pokój | Główny łańcuch | Nowość | Złota rybka |
|---|---|---|---|---|
| 1 | Sypialnia | szafa → przysmaki → kot → kluczyk → szafka nocna → liścik → zegar 7:45 → kłódka | podstawy: otwieranie, użycie przedmiotu, notatka, kłódka | pod rogiem dywanu |
| 2 | Kuchnia | lodówka → mleko → miska → szafka pod zlewem → śrubokręt → kratka okapu → przepis → kubki → klawiatura 1368 | kolejność z dokumentu + ukryte cyfry | w zamrażarce |
| 3 | Łazienka | szafka → myszka → kot z kosza → kurek → prysznic → para → lustro ★●▲■ → kaczki → kolorowy zamek | zmiana stanu pokoju (para), mapowanie symbol → kolor | w pralce |
| 4 | Salon | doniczka → piórko → kot → poduszka → pilot; obraz 🌙☀⭐ → szuflada → baterie; pilot+baterie → TV „3·1·4·2” → książki → MIAU | łączenie przedmiotów, zamek z literami i symbolami | w akwarium (potrzebna siatka z szafki RTV) |
| 5 | Gabinet | szuflada → lupa → mapa → globus 942 → kluczyk → szuflada → pokrętło → obraz → sejf-przesuwanka → duży klucz | dłuższy łańcuch, przesuwanka | opcjonalny łańcuch: lampa → kot się przenosi → zdjęcie 3:15 → zegar szafkowy |
| 6 | Strych | latarka+baterie → bezpieczniki (światła) → cyfry na kartonach 2704 → kufer → tuńczyk → kot z belki → kluczyk → drabina → okno dachowe | ciemność i światło, minigra „zapal wszystkie” | za zakurzonym lustrem (szmatka z kufra) |

Każdy pokój ma w kodzie **scenariusz rozwiązania** i **kroki podpowiedzi**. Test automatyczny (`npm test`)
przechodzi wszystkie pokoje i sprawdza, że żaden krok podpowiedzi nie zostaje otwarty.

## Ekonomia i zarabianie

Filozofia: **wszystko da się przejść za darmo**, ale zagadki wymagają czasu. Kto nie lubi czekać ani się męczyć, kupuje skróty.

| Zasób | Skąd | Na co |
|---|---|---|
| 💡 Podpowiedzi | 3 na start, 1 darmowa co 20 min (maks. 1 w zapasie), reklama z nagrodą (co 3 min, maks. 15/dzień), nagroda dzienna, 40 🪙, paczki IAP | odsłonięcie podpowiedzi (1 💡 za każdy z 3 poziomów), pominięcie pokoju (5 💡) |
| 🪙 Monety | ukończenie pokoju: 20 + 10 za gwiazdkę + 30 za złotą rybkę (x2 za reklamę), nagroda dzienna | podpowiedzi (40), futerka kota (300–700) |
| ⭐ Gwiazdki | 3 bez podpowiedzi, 2 przy ≤ 2, 1 przy więcej | prestiż, powód do samodzielnego myślenia |
| 🐠 Złote rybki | 1 ukryta w każdym pokoju | wszystkie 6 = kosmiczne futerko |

**Produkty w Google Play** (`src/platform/config.ts`):

| ID | Zawartość | Cena startowa |
|---|---|---|
| `starter_pack` | 15 💡 + złote futerko + bez reklam (jednorazowy) | 14,99 zł |
| `hints_small` | 5 💡 | 4,99 zł |
| `hints_medium` | 20 💡 | 14,99 zł |
| `hints_large` | 60 💡 | 34,99 zł |
| `no_ads` | brak reklam między pokojami | 9,99 zł |

Nie ma skrzynek z losową zawartością, więc nie trzeba publikować szans na nagrody.

**Reklamy:** z nagrodą (podpowiedź, podwójne monety) oraz rzadkie pełnoekranowe **tylko między pokojami**,
od 2. pokoju, najwcześniej po 5 minutach sesji, co najmniej 4 minuty odstępu.

## Retencja
- Darmowa podpowiedź co 20 minut: powód, żeby wrócić, gdy utkniesz.
- Nagroda dzienna z 7-dniową serią (monety i podpowiedzi).
- Gwiazdki i złote rybki: powód, żeby przejść pokój jeszcze raz, lepiej.
- Stan pokoju zapisuje się na bieżąco, więc można wyjść w połowie i wrócić.

## Technika
- Three.js, wszystkie modele z brył, tekstury rysowane w canvasie, cienie (wyłączane na słabszych telefonach).
- Jeden pokój w pamięci naraz, kilkaset prostych siatek: płynnie na tanich telefonach.
- Dźwięki i muzyka syntezowane w WebAudio (bez plików audio).
- Zapis w `localStorage` (WebView Capacitora). Bez serwera, bez konta.

## Roadmapa
1. **Rozdział 2 „Ogród i szopa”** (6 pokoi): na zewnątrz, pogoda, narzędzia ogrodowe, kot na drzewie.
2. **Rozdział 3 „Stary zamek”**: dłuższe łańcuchy, więcej minigier (rury, wagi, lustra z promieniem).
3. Odblokowanie rozdziałów: kolejny rozdział otwiera się po ukończeniu poprzedniego albo od razu za zakup „Klucz do rozdziału”.
4. Codzienna zagadka (mini-pokój generowany z puli) z nagrodą w podpowiedziach.
5. Przypomnienia (lokalne powiadomienia): „Twoja darmowa podpowiedź czeka!”.
6. Zapis w chmurze (Google Play Games) i weryfikacja zakupów na serwerze.
