# Pokój 100 / Room 100 🚪🩸

Mobilna gra typu **escape room w klimacie horroru**: 100 zamkniętych pokoi, każdy trudniejszy od poprzedniego.
Rozglądasz się ściana po ścianie, przeszukujesz szafy, kufry, trumny i kratki wentylacyjne, zbierasz przedmioty,
łączysz je w ekwipunku i łamiesz szyfry, a coś w ciemności cały czas cię obserwuje.

- **100 poziomów w 10 miejscach:** opuszczony dom, piwnica, szpital psychiatryczny, szkoła nocą, hotel „Cisza”,
  kostnica, laboratorium, krypta, kanały i finałowy Pokój 100
- **Poziomy są generowane** z ziarna (każdy poziom jest zawsze taki sam) przez generator zagadek, który
  buduje łańcuch od drzwi wstecz. Im dalej, tym więcej zamków w drzwiach, dłuższe łańcuchy i trudniejsze wskazówki
- **Klimat:** mgła, brud i zacieki na ścianach, migająca żarówka, krwawe napisy, lalki, manekiny, szepty,
  pukanie, niepokojący dźwięk w tle i straszaki (cień w pokoju, trzask), które można wyłączyć w ustawieniach
- **Silnik:** TypeScript + [Three.js](https://threejs.org), wszystkie modele z brył (zero plików 3D), dźwięki syntezowane
- **Build:** Vite · **Android / Play Store:** Capacitor 8 (`android/`), orientacja pozioma · **Języki:** PL i EN

Pełny opis gry, krzywa trudności i zarabianie: [`docs/GDD.md`](docs/GDD.md).

## Uruchomienie w przeglądarce

```bash
npm install
npm run dev        # http://localhost:5173 — na telefonie otwórz adres z sieci lokalnej i obróć telefon poziomo
```

Sterowanie: strzałki po bokach lub przesunięcie palcem obraca widok; stuknięcie mebla przybliża go albo otwiera;
stuknij przedmiot w ekwipunku, żeby go wybrać, a potem miejsce, gdzie ma zadziałać. Dwa przedmioty wybrane po kolei
łączą się (np. latarka + baterie). Wybrany przedmiot stuknięty drugi raz pokazuje się z bliska (kartki można czytać).

## Struktura

| Plik | Co robi |
|---|---|
| `src/gen/level.ts` | **Generator poziomów.** Zamki, schowki, narzędzia, kody i ich wskazówki, podpowiedzi i rozwiązanie. Tu stroisz trudność (`gatesAllowed`, `codeKinds`, `digitClue`, `door`) |
| `src/gen/themes.ts` | 10 miejsc: kolory, tekstury, rekwizyty, teksty na start, napisy na ścianach |
| `src/engine/room.ts` | Silnik pokoju: kamera ściana-po-ścianie i przybliżenia, stukanie, ekwipunek, łączenie, światło, mgła, ciemność z latarką, straszaki |
| `src/engine/types.ts` | Format pokoju (API, z którego korzysta generator) |
| `src/view/horror.ts` | Modele: szafy, szafki, komody, kufry, skrzynie, sejf, apteczka, kratka, trumna, obrazy, lalki, manekiny, cień… |
| `src/view/furniture.ts`, `src/view/kit.ts` | Pomocnicze modele, materiały, tekstury rysowane w canvasie (brud, krwawe napisy) |
| `src/ui/hud.ts`, `src/ui/locks.ts`, `src/ui/style.css` | Interfejs, menu 100 poziomów, kłódki i minigry |
| `src/profile.ts` | Zapis postępu, podpowiedzi, monety, nagroda dzienna, darmowa podpowiedź co 20 min |
| `src/platform/` | Reklamy AdMob, zakupy Google Play i ich konfiguracja (`config.ts`) |
| `src/audio.ts`, `src/music.ts` | Efekty i tło dźwiękowe generowane w WebAudio |
| `scripts/walkthrough.mjs` | Test: bot przechodzi wszystkie 100 poziomów według wygenerowanych rozwiązań |

## Grafika realistyczna (w trakcie — na razie motyw 1)

Motywy z polem `pbr` w `src/gen/themes.ts` używają tekstur ze zdjęć i modeli z Blendera zamiast prymitywów:

- **Tekstury**: obrazy źródłowe (wygenerowane w Gemini) leżą w `tools/textures/src/`.
  `python3 tools/textures/process.py` (Pillow, numpy, scipy) robi z nich bezszwowe mapy PBR
  (`*_c/_n/_r.jpg`), obrazy (`portrait.jpg`, `paper.jpg`) i decale z przezroczystością (`*.webp`) w `public/textures/`.
- **Modele**: `python3 tools/blender/furniture.py [nazwy...]` (wymaga `pip install bpy`, Python 3.11) buduje meble
  i eksportuje `public/models/*.glb`. Ruchome części to nazwane węzły (`doorL`, `doorR`, `drawer`, `lid`, `leaf`,
  `rock`, `head`), materiały to tylko nazwy slotów (`oak`, `brass`, `iron`…) — gra podstawia tekstury w `src/view/models.ts`.
- **Podgląd**: `node scripts/shot.mjs <poziom> <katalog> [w0 w1 w2 w3]` robi zrzuty ścian poziomu.
- Koncepty motywu: `docs/concept/`.

## Testy

```bash
npm test                  # bot przechodzi wszystkie 100 poziomów w przeglądarce bez okna (~10 min, potrzebny Chromium)
LEVELS=40-60 npm test     # wybrany zakres
```

Chromium: `npx playwright install chromium` albo zmienna `CHROME_PATH` ze ścieżką do Chrome.

## Zarabianie

Wszystko da się przejść za darmo, ale późniejsze poziomy wymagają dużo czasu i myślenia. Kto nie chce czekać, kupuje skróty:

- **💡 Podpowiedzi:** każdy krok ma 3 podpowiedzi (sugestia → wskazówka → rozwiązanie), każda za 1 💡.
  Za darmo: 3 na start, **1 co 20 minut**, 1 za reklamę (co 3 min, max 15 dziennie), nagroda dzienna, 40 🪙 w sklepie.
- **⏭️ Pominięcie poziomu** za 5 💡.
- **★ Gwiazdki:** 3 bez podpowiedzi, 2 przy maks. 2, 1 przy więcej.
- **Reklamy:** z nagrodą (podpowiedź, podwójne monety) i rzadkie pełnoekranowe tylko między poziomami.
- **Zakupy (Google Play Billing):** `starter_pack` (20 💡 + bez reklam), `hints_small`, `hints_medium`, `hints_large`, `no_ads`.

### Co musisz ustawić przed wydaniem

1. **AdMob:** utwórz aplikację i jednostki *Z nagrodą* i *Pełnoekranowa*, wpisz ID w `src/platform/config.ts`
   i w `android/app/src/main/AndroidManifest.xml`. Teraz są tam **publiczne testowe ID Google** (to nie są sekrety).
2. **Play Console → Produkty w aplikacji:** `starter_pack`, `hints_small`, `hints_medium`, `hints_large`, `no_ads`.
3. **Polityka prywatności:** [`docs/privacy-policy.html`](docs/privacy-policy.html) — wpisz swój e-mail zamiast `KONTAKT@example.com`
   i opublikuj ją pod publicznym adresem.
4. **Klasyfikacja wiekowa:** gra zawiera przemoc/grozę (krew, straszaki) — odpowiedzi do ankiety w [`docs/store-listing.md`](docs/store-listing.md).

## Budowanie na Androida

Każdy push buduje grę w GitHub Actions: **Actions → Android build → Artifacts → `room100-debug-apk`**.

**Klucze i hasła nigdy nie trafiają do repozytorium.** `.gitignore` blokuje `*.jks`, `*.keystore`, `.env`,
`google-services.json`. Podpisany plik `.aab` powstaje tylko wtedy, gdy w **Settings → Secrets and variables → Actions**
dodasz sekrety `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`:

```bash
keytool -genkeypair -v -keystore room100.jks -alias room100 -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 room100.jks > room100.jks.b64    # zawartość tego pliku wklej jako KEYSTORE_BASE64
```

Nazwa pakietu: **`pl.jasior.room100`** (nie da się jej zmienić po pierwszym wgraniu). Nazwa na telefonie:
„Pokój 100” po polsku, „Room 100” w innych językach. Lokalnie: Android Studio + JDK 21, `npm run android`.
