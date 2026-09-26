# Kocia Ucieczka / Cat Escape 🐱🔑

Mobilna gra logiczna typu **ucieczka z pokoju (escape room)** w 3D. Jesteś zamknięty w domu razem z kotem Mruczkiem
i musisz uciec z kolejnych pokoi. Rozglądasz się ściana po ścianie, przybliżasz meble, zbierasz przedmioty,
łączysz je w ekwipunku i łamiesz szyfry. Mruczek w każdym pokoju jest częścią zagadki: śpi na kluczyku,
pilnuje szafki albo utknął na belce.

- **Rozdział 1 „Dom”:** 6 pokoi (Sypialnia → Kuchnia → Łazienka → Salon → Gabinet → Strych), każdy z ukrytą złotą rybką
- **Zagadki:** kłódki na cyfry, litery i symbole, klawiatura, kolorowy zamek, przesuwanka, „zgaś/zapal światła”
- **Silnik:** TypeScript + [Three.js](https://threejs.org). Wszystkie modele low-poly (kot, meble) są generowane kodem, zero plików 3D
- **Build:** Vite · **Android / Play Store:** Capacitor 8 (projekt w `android/`), orientacja pozioma
- **Języki:** polski i angielski (automatycznie wg języka telefonu)

Pełny opis gry, ekonomia i pomysły na kolejne rozdziały: [`docs/GDD.md`](docs/GDD.md).

## Uruchomienie w przeglądarce

```bash
npm install
npm run dev        # http://localhost:5173 — na telefonie otwórz adres z sieci lokalnej i obróć telefon poziomo
```

Sterowanie: strzałki po bokach lub przesunięcie palcem obraca widok; stuknięcie mebla przybliża go albo otwiera;
stuknij przedmiot w ekwipunku, żeby go wybrać, i stuknij miejsce, gdzie chcesz go użyć. Dwa różne przedmioty
wybrane jeden po drugim łączą się (np. pilot + baterie). Stuknięcie wybranego przedmiotu drugi raz pokazuje go z bliska.

## Struktura

| Plik | Co robi |
|---|---|
| `src/rooms/*.ts` | **Pokoje.** Każdy plik to jeden pokój: meble, przedmioty, co się dzieje po stuknięciu, podpowiedzi i rozwiązanie |
| `src/engine/types.ts` | Opis formatu pokoju (API, którego używają pliki pokoi) |
| `src/engine/room.ts` | Silnik pokoju: kamera ściana-po-ścianie i przybliżenia, stukanie w obiekty, ekwipunek, łączenie przedmiotów, kot |
| `src/view/furniture.ts` | Modele mebli i przedmiotów z prostych brył |
| `src/view/cat.ts` | Mruczek: model, pozy (siedzi, leży, śpi, skacze), animacje i futerka |
| `src/view/kit.ts` | Materiały, bryły i tekstury rysowane w canvasie (tapety, zegary, kartki) |
| `src/ui/hud.ts` | Cały interfejs: menu, ekwipunek, dymki, podpowiedzi, sklep, futerka, ustawienia, ekran wygranej |
| `src/ui/locks.ts` | Kłódki i minigry (kółka z cyframi/literami/symbolami, klawiatura, kolory, przesuwanka, światła) |
| `src/profile.ts` | Zapis postępu, podpowiedzi, monety, nagroda dzienna, darmowa podpowiedź co 20 min |
| `src/platform/` | Reklamy AdMob, zakupy Google Play i ich konfiguracja (`config.ts`) |
| `src/audio.ts`, `src/music.ts` | Dźwięki (w tym miauczenie i mruczenie) i muzyka generowane w WebAudio |
| `src/i18n.ts` | Teksty interfejsu PL/EN (teksty pokoi są w plikach pokoi) |
| `scripts/walkthrough.mjs` | Test: bot przechodzi wszystkie pokoje według zapisanych rozwiązań |

### Jak dodać nowy pokój

1. Skopiuj np. `src/rooms/kitchen.ts`, zmień `id`, nazwę, kolory (`theme`) i meble w `build()`.
2. Obiekty: `b.obj(id, model, miejsce)` + `.tap(...)` (stuknięcie), `.use(przedmiot, ...)` (użycie przedmiotu),
   `.show(...)` (kiedy widoczny), `.anim(...)` (np. otwieranie drzwiczek), `.zoom(widok)` (przybliżenie).
   Przedmioty do podniesienia: `b.pickup(...)`, złota rybka: `b.goldFish(...)`, kot: `b.catSpot(...)` i `b.cat(...)`.
3. Dopisz kroki podpowiedzi (`hints`) i rozwiązanie (`solution`), a pokój do listy w `src/rooms/index.ts`.
4. `npm test` sprawdzi, czy pokój da się przejść i czy podpowiedzi prowadzą do końca.

## Testy

```bash
npm test          # bot przechodzi wszystkie 6 pokoi w przeglądarce bez okna (potrzebny Chromium)
```

Chromium: `npx playwright install chromium` albo zmienna `CHROME_PATH` ze ścieżką do Chrome.

## Zarabianie: podpowiedzi, reklamy i zakupy

Grę da się przejść całkowicie za darmo, ale zagadki wymagają myślenia i czasu. Kto nie chce czekać, może sobie pomóc:

- **💡 Podpowiedzi:** każdy krok zagadki ma 3 podpowiedzi (delikatna → wyraźna → rozwiązanie), każda kosztuje 1 💡.
  Za darmo: 3 na start, **1 co 20 minut**, 1 za obejrzenie reklamy (co 3 min, max 15 dziennie), nagroda dzienna.
  Można je też kupić za monety (40 🪙) albo w paczkach za prawdziwe pieniądze.
- **⏭️ Pominięcie pokoju** za 5 💡 (bez gwiazdek).
- **⭐ Gwiazdki** zależą od podpowiedzi: 3 bez podpowiedzi, 2 przy maks. 2, 1 przy więcej. To powód, żeby próbować samemu.
- **🐱 Futerka** dla Mruczka za monety; złote futerko w pakiecie startowym, kosmiczne za znalezienie wszystkich złotych rybek.
- **Reklamy:** z nagrodą (podpowiedź, podwójne monety) i rzadkie pełnoekranowe tylko między pokojami
  (najwcześniej po 5 minutach, co najmniej 4 minuty odstępu, nigdy dla kupujących „Bez reklam”).
- **Zakupy (Google Play Billing):** `starter_pack`, `hints_small`, `hints_medium`, `hints_large`, `no_ads` + przywracanie zakupów.

W przeglądarce zamiast reklamy pokazuje się oznaczona „Reklama testowa”, a zakupy działają tylko w wersji deweloperskiej (`npm run dev`).

### Co musisz ustawić przed wydaniem

1. **AdMob** ([admob.google.com](https://admob.google.com)): dodaj aplikację i utwórz 2 jednostki: *Z nagrodą* i *Pełnoekranowa*.
   Wpisz ich ID w `src/platform/config.ts` (`ADMOB`) i ID aplikacji w `android/app/src/main/AndroidManifest.xml`.
   Teraz są tam **publiczne testowe ID Google** (to nie są żadne klucze ani sekrety).
   Zostaw `testing: true`, dopóki testujesz. **Nigdy nie klikaj prawdziwych reklam we własnej grze.**
2. **Google Play Console** → Zarabianie → Produkty w aplikacji: utwórz produkty o ID
   `starter_pack`, `hints_small`, `hints_medium`, `hints_large`, `no_ads` i ustaw ceny (ceny w grze wczytają się same).
3. **Profil płatności** w Play Console i dane do wypłat w AdMob.
4. **Polityka prywatności:** [`docs/privacy-policy.html`](docs/privacy-policy.html) — wpisz swój e-mail w miejsce `KONTAKT@example.com`
   i opublikuj ją pod publicznym adresem (np. GitHub Pages z folderu `/docs` albo Google Sites).
5. Teksty do karty sklepu, ankieta treści i „Bezpieczeństwo danych”: [`docs/store-listing.md`](docs/store-listing.md).

## Budowanie na Androida

### GitHub Actions (bez instalowania czegokolwiek)

Każdy push buduje grę (`.github/workflows/android.yml`): zakładka **Actions** → ostatni przebieg **Android build**
→ w sekcji **Artifacts** pobierz `cat-escape-debug-apk`, wyślij `app-debug.apk` na telefon i zainstaluj.

### Klucz podpisu i plik .aab do Google Play

**Klucze i hasła nigdy nie trafiają do repozytorium.** `.gitignore` blokuje `*.jks`, `*.keystore`, `.env`,
`google-services.json` i podobne. Podpisywanie działa tylko przez sekrety GitHuba:

1. Utwórz klucz **raz** na swoim komputerze i przechowuj go bezpiecznie (menedżer haseł + kopia offline):

   ```bash
   keytool -genkeypair -v -keystore cat-escape.jks -alias catescape -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 cat-escape.jks > cat-escape.jks.b64
   ```

2. Repozytorium → **Settings → Secrets and variables → Actions** → dodaj sekrety:
   `KEYSTORE_BASE64` (zawartość `.b64`), `KEYSTORE_PASSWORD`, `KEY_ALIAS` (`catescape`), `KEY_PASSWORD`.
3. Od następnego pusha w **Artifacts** pojawi się `cat-escape-release-aab` do wgrania w Play Console.
   `versionCode` rośnie sam, `versionName` zmieniasz w `android/app/build.gradle`.

### Na własnym komputerze

Wymagania: Android Studio (z SDK) i JDK 21. `npm run android` buduje grę, synchronizuje Capacitor i otwiera projekt.

### Wydanie w Google Play

1. Nazwa pakietu to **`pl.jasior.catescape`** (nie da się jej zmienić po pierwszym wgraniu).
   Nazwa na telefonie: „Kocia Ucieczka” po polsku, „Cat Escape” w innych językach.
2. Nowe konta prywatne muszą przejść **test zamknięty: min. 12 testerów przez 14 dni**.
3. Ikona i ekran startowy są generowane z `assets/icon-only.png` i `assets/logo.png` (wyrenderowane z modelu kota):
   `npx @capacitor/assets generate --android --iconBackgroundColor '#3a9bb0' --splashBackgroundColor '#f6e7d4'`.
