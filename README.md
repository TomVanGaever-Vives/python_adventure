# 🐍 Python Avontuur

Een educatief programmeerspel om **Python** te leren, voor leerlingen van het **5e en 6e leerjaar** (10–12 jaar).
De kinderen kennen al blokprogrammeren (Scratch, MakeCode); hier typen ze echte Python-code.

- **Deel 1 – Grot-avontuur:** ontdekkingsreiziger Kai loopt over een rooster, verzamelt kristallen, springt over gaten en zoekt de uitgang. Elk commando wordt live geanimeerd.
- **Deel 2 – micro:bit-lab:** een virtuele micro:bit, aangestuurd met echte MicroPython (`from microbit import *`). Het programma kan je daarna als `.hex`-bestand op een **echte micro:bit** zetten.

Alles draait in de browser als statische website (GitHub Pages):
**geen server, geen logins, geen persoonsgegevens.** Voortgang en code worden enkel lokaal in de browser bewaard (`localStorage`).
Alle bibliotheken staan in de map `vendor/` (geen CDN), dus schoolfilters vormen geen probleem. Getest in Chrome (Chromebooks).

---

## Voor de leerkracht

### Website online zetten met GitHub Pages

1. Ga op GitHub naar deze repository → **Settings** → **Pages**.
2. Kies bij *Build and deployment* → *Source*: **Deploy from a branch**.
3. Kies de branch **main** en de map **/ (root)** → **Save**.
4. Na een minuutje staat de site op `https://<jouw-gebruikersnaam>.github.io/<naam-van-de-repository>/`.
5. Deel die link met de klas (bv. via een QR-code of een snelkoppeling in Smartschool/Google Classroom).

Je kan de site ook zonder internet gebruiken: download de repository als ZIP, pak uit en open `index.html` in Chrome.

### Goed om te weten

- **Voortgang** wordt per browser/computer bewaard. Werken leerlingen op gedeelde Chromebooks met hun eigen schoolaccount, dan heeft elk kind zijn eigen voortgang. Wissen kan onderaan de levelkaart (*Voortgang wissen*).
- Alle levels zijn **vrij te kiezen** op de levelkaart; het volgende aanbevolen level is gemarkeerd.
- Elk level heeft een **dubbel doel**: ✔ *gehaald* en ★ *bonus* als het lukt met maximaal N regels code (lege regels en commentaar tellen niet mee).
- **Foutmeldingen** zijn in het Nederlands, met regelnummer en tip (spelfouten in namen, vergeten dubbelpunt, haakjes, inspringen, oneindige lus …). De Python-commando's zelf blijven Engels.
- **Stop-knop** en **snelheidsregelaar** (🐢 → 🐇). De regel die uitgevoerd wordt licht geel op.
- Sneltoetsen: **Ctrl+Enter** = start, **Tab** = inspringen (4 spaties).
- Voorbeeldoplossingen van elk level staan in [`tests/oplossingen-grot.js`](tests/oplossingen-grot.js) en [`tests/oplossingen-microbit.js`](tests/oplossingen-microbit.js).

---

## Deel 1 – Grot-avontuur (19 levels)

**Commando's:** `move_right()`, `move_left()`, `move_up()`, `move_down()` (met optioneel aantal stappen, bv. `move_right(3)`),
`jump_right()` / `jump_left()` (springt over één vakje), `say("tekst")`, `print()`.
**Meten:** `distance_right()` geeft het aantal vrije vakjes naar rechts (tot een muur of gat).
**Sensoren:** `wall_right()`, `wall_left()`, `wall_up()`, `wall_down()`, `hole_right()`, `hole_left()`, `hole_up()`, `hole_down()`, `at_exit()`.

| # | Level | Hoofdstuk | Leerdoel | Bonus |
|---|-------|-----------|----------|-------|
| 1 | Eerste stappen | Commando's | Een commando schrijven: naam + haakjes, één per regel | 4 regels |
| 2 | Om de hoek | Commando's | Vier richtingen, kristallen oprapen | 6 |
| 3 | Kristallenjacht | Commando's | Route plannen (sequentie), `move_left()` | 10 |
| 4 | Spring! | Commando's | `jump_right()`, gaten vermijden | 4 |
| 5 | Grote stappen | Argumenten | Een getal als argument: `move_right(8)` | 3 |
| 6 | Het slakkenhuis | Argumenten | Vakjes tellen, argumenten gebruiken | 7 |
| 7 | De trap | For-lussen | `for i in range(4):` en inspringen | 4 |
| 8 | De gatenrij | For-lussen | Een patroon herkennen en herhalen | 4 |
| 9 | De kristalkam | For-lussen | Lus met meerdere commando's en argumenten | 4 |
| 10 | Meet de gang | Variabelen | Variabele maken: `afstand = distance_right()` – 3 kaarten | 4 |
| 11 | De groeiende trap | Variabelen | Variabele veranderen: `stap = stap + 1` in een lus | 5 |
| 12 | Dubbel zo ver | Variabelen | Rekenen met variabelen: `afstand * 2` – 3 kaarten | 4 |
| 13 | Springen of lopen? | If / else | `if hole_right(): … else: …` – 3 kaarten | 5 |
| 14 | Links of rechts? | If / else | Sensor `wall_left()` – 2 kaarten | 5 |
| 15 | Hoe ver nog? | While | `while not at_exit():` – 3 kaarten met andere lengte | 2 |
| 16 | Gaten onderweg | While | `if` binnen `while`, dubbele inspringing – 3 kaarten | 5 |
| 17 | De trap op | While | `while` + `if wall_right()` – 3 verschillende trappen | 5 |
| 18 | Rotsen beklimmen | Functies | Eigen commando maken met `def klim():` | 10 |
| 19 | Bergen van elke maat | Functies | Functie met parameter: `def berg(hoogte):` | 8 |

Levels met variabelen, `if` en `while` worden getest op **meerdere varianten van de kaart**: de code moet op elke kaart werken,
dus een vaste reeks commando's werkt niet. Na een geslaagde eerste kaart worden de andere kaarten snel nagespeeld.

## Deel 2 – micro:bit-lab (10 levels + vrije speelzone)

De virtuele micro:bit ondersteunt: `display.show / scroll / clear / set_pixel / get_pixel`, `Image` (alle ingebouwde afbeeldingen en eigen afbeeldingen zoals `Image("09090:99999:99999:09990:00900")`),
`button_a` / `button_b` (`is_pressed`, `was_pressed`, `get_presses`), `sleep`, `running_time`, `temperature`,
`accelerometer` (`get_x/y/z`, `current_gesture`, `is_gesture`, `was_gesture` – met schudden en kantelen), `import random`.
Knoppen: klikken of toetsen **A** en **B**. Onder het bord: *Schud*, kantelknoppen, temperatuur- en lichtschuif.

Bij **✔ Controleer** wordt het programma automatisch nagekeken: het draait razendsnel in een testmodus waarin
knoppen, schudden en kantelen worden nagebootst.

| # | Level | Leerdoel | Wordt gecontroleerd | Bonus |
|---|-------|----------|---------------------|-------|
| 1 | Een hartje | `from microbit import *`, `display.show(Image.HEART)` | Hartje op het scherm | 2 regels |
| 2 | Naam in lichtjes | Tekst (string) en `display.scroll()` | Er scrollt een naam | 2 |
| 3 | Kloppend hart | `sleep()` en een `for`-lus | Hart klopt ≥ 5 keer, lus gebruikt | 6 |
| 4 | Aftellen | `range(5, 0, -1)`, variabele `i` | 5-4-3-2-1 met pauzes, dan afbeelding | 5 |
| 5 | Knop A of B? | `while True`, `if/elif`, `is_pressed()` | A → blij, B → verdrietig | 6 |
| 6 | Teller | Variabelen, `was_pressed()` | A telt op, B zet op 0 | 9 |
| 7 | Dobbelsteen | `import random`, `randint`, schudden | Na elke schudbeweging 1–6, willekeurig | 5 |
| 8 | Waterpas | Versnellingsmeter, vergelijken `<` `>` | Pijl links/rechts, leeg als plat | 9 |
| 9 | De diagonaal | Coördinaten (x, y), `set_pixel` in een lus | Schuine lijn | 3 |
| 10 | Dambord | Geneste lussen, `%` (rest) | Dambordpatroon met `set_pixel` | 5 |
| ★ | Vrije speelzone | Alles combineren | – | – |

### Op een echte micro:bit zetten

- **⬇ Zet op micro:bit** maakt een `.hex`-bestand dat werkt op **micro:bit V1 én V2** (universal hex, gebouwd met
  [`@microbit/microbit-fs`](https://github.com/microbit-foundation/microbit-fs) en de officiële MicroPython-firmware V1.1.1 en V2.1.2, lokaal in `vendor/`).
  Op een Chromebook: micro:bit aansluiten met USB → app *Bestanden* → *Downloads* → het bestand naar de schijf **MICROBIT** slepen.
- **📋 Kopieer voor python.microbit.org** kopieert de code, om te plakken in de officiële editor.

---

## Technisch

```
index.html          startpagina
grot.html           Deel 1 – Grot-avontuur
microbit.html       Deel 2 – micro:bit-lab
css/style.css
js/common/          Python-runner (Skulpt), Nederlandse foutmeldingen, editor, opslag, levelkaart
js/cave/            levels, grotwereld + tekenen (canvas), spellogica
js/microbit/        levels + controles, lettertype, Python-module "microbit", virtuele hardware, .hex-export
vendor/             Skulpt 1.2.0, CodeMirror 5.65, @microbit/microbit-fs 0.11, MicroPython-firmware (alle MIT-licentie)
tests/              voorbeeldoplossingen + automatische test (Playwright)
```

- Python draait met [Skulpt](https://skulpt.org): het programma pauzeert bij elk commando zodat de animatie zichtbaar is, en kan altijd gestopt worden.
- Nieuwe levels toevoegen: `js/cave/levels.js` (kaart als tekst: `#` muur, `.` vloer, `O` gat, `*` kristal, `H` start, `E` uitgang; meerdere kaarten = varianten) of `js/microbit/levels.js` (met een testscenario en controles).

### Testen

```bash
npm install playwright && npx playwright install chromium
node tests/test-alles.js           # speelt elk level met de voorbeeldoplossing
node tests/test-alles.js --shots   # + screenshots in tests/screenshots/
```

## Licenties

Eigen code en tekeningen: vrij te gebruiken in de klas. Bibliotheken in `vendor/`: Skulpt (MIT), CodeMirror (MIT), microbit-fs (MIT), MicroPython (MIT) – zie de LICENSE-bestanden in elke map.
"micro:bit" is een merk van de Micro:bit Educational Foundation; dit project is er niet mee verbonden.
