/*
 * micro:bit-levels. Elke opdracht wordt gecontroleerd door het programma
 * in "testmodus" uit te voeren (virtuele tijd + gesimuleerde knoppen/schudden).
 */
(function () {
  'use strict';

  function imgPx(s) {
    const rows = s.split(':');
    const px = [];
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) px.push(Number((rows[y] || '')[x] || 0));
    return px;
  }
  const IMG = name => imgPx(window.MB_IMAGES[name]);
  const on = px => px.map(v => (v > 0 ? 1 : 0)).join('');
  const same = (a, b) => !!a && !!b && on(a) === on(b);
  const press = (id, t, dur) => [{ t: t, type: 'btn', id: id, down: true }, { t: t + (dur || 100), type: 'btn', id: id, down: false }];

  /** Hulpmiddelen voor de controles. */
  function makeCtx(log, code) {
    const frames = log.filter(e => e.type === 'frame');
    const texts = log.filter(e => e.type === 'show' || e.type === 'scroll');
    return {
      log, code, frames, texts,
      shows: log.filter(e => e.type === 'show'),
      scrolls: log.filter(e => e.type === 'scroll'),
      final: frames[frames.length - 1].px,
      at(t) { let px = frames[0].px; for (const f of frames) { if (f.t <= t) px = f.px; else break; } return px; },
      lastTextBefore(t) { let r = null; for (const e of texts) { if (e.t <= t) r = e.text; } return r; },
      img: IMG,
      glyph: ch => MBFont.glyph(ch),
      same,
      anyFrame(px) { return frames.some(f => same(f.px, px)); },
      uses: re => re.test(code.replace(/#.*$/gm, '')),
    };
  }

  const chapters = [
    { id: 1, icon: '💡', title: 'Hoofdstuk 1 – Het scherm', sub: 'Afbeeldingen, tekst en getallen op de 25 lampjes.' },
    { id: 2, icon: '🎮', title: 'Hoofdstuk 2 – Knoppen en sensoren', sub: 'Laat de micro:bit reageren op knoppen, schudden en kantelen.' },
    { id: 3, icon: '🎨', title: 'Hoofdstuk 3 – Pixels tekenen', sub: 'Teken zelf met set_pixel en lussen.' },
    { id: 4, icon: '🛝', title: 'Speelzone', sub: 'Maak wat je wil en zet het op je echte micro:bit.' },
  ];

  const IMPORT = 'from microbit import *\n';

  const levels = [
    {
      id: 'm1', chapter: 1, title: 'Een hartje',
      story: 'Je micro:bit heeft 25 lampjes (leds). Laat hem zien dat je hem graag ziet!',
      goal: 'Toon een <b>hartje</b> op het scherm. Bonus: <b>2 regels</b>.',
      concept: {
        title: 'from microbit import * en display.show()',
        html: 'De eerste regel <code>from microbit import *</code> geeft je toegang tot alles van de micro:bit. Met <code>display.show()</code> toon je iets op het scherm. Er zijn veel ingebouwde afbeeldingen: <code>Image.HEART</code>, <code>Image.HAPPY</code>, <code>Image.DUCK</code>…',
        example: 'from microbit import *\ndisplay.show(Image.HAPPY)',
      },
      commands: ['from microbit import *', 'display.show(Image.HEART)', 'display.show(Image.HAPPY)'],
      starter: IMPORT,
      maxLines: 2,
      hints: ['Gebruik <code>display.show(Image.HEART)</code>.'],
      test: { duration: 3000 },
      checks: c => [{ ok: c.anyFrame(c.img('HEART')), text: 'Het scherm toont Image.HEART' }],
    },
    {
      id: 'm2', chapter: 1, title: 'Naam in lichtjes',
      story: 'Laat iedereen weten van wie deze micro:bit is.',
      goal: 'Laat je <b>naam</b> over het scherm <b>scrollen</b>. Bonus: <b>2 regels</b>.',
      concept: {
        title: 'Tekst scrollen',
        html: '<code>display.scroll("tekst")</code> laat tekst van rechts naar links over het scherm schuiven. Tekst zet je altijd tussen <b>aanhalingstekens</b>.',
        example: 'display.scroll("Hallo!")',
      },
      commands: ['display.scroll("Hallo")'],
      starter: IMPORT,
      maxLines: 2,
      hints: ['Typ <code>display.scroll("Lotte")</code> maar dan met jouw naam.'],
      test: { duration: 30000 },
      checks: c => [{ ok: c.scrolls.some(e => /[A-Za-zÀ-ÿ]{2,}/.test(e.text)), text: 'Er scrollt een naam (minstens 2 letters) over het scherm' }],
    },
    {
      id: 'm3', chapter: 1, title: 'Kloppend hart',
      story: 'Een hart dat klopt: groot, klein, groot, klein…',
      goal: 'Laat het hart <b>5 keer kloppen</b>: wissel <code>Image.HEART</code> en <code>Image.HEART_SMALL</code> af, met een pauze. Bonus: <b>max. 6 regels</b>.',
      concept: {
        title: 'sleep() en een for-lus',
        html: '<code>sleep(500)</code> wacht 500 milliseconden (een halve seconde). Een <code>for</code>-lus herhaalt de ingesprongen regels: <code>range(5)</code> = 5 keer.',
        example: 'for i in range(5):\n    display.show(Image.HEART)\n    sleep(500)',
      },
      commands: ['for i in range(5):\n    ', 'display.show(Image.HEART)', 'display.show(Image.HEART_SMALL)', 'sleep(500)'],
      starter: IMPORT + '\n',
      maxLines: 6,
      hints: ['Groot hart, wachten, klein hart, wachten. Dat zijn 4 regels in de lus.', 'Vergeet niet in te springen (Tab) onder de for-regel.'],
      test: { duration: 15000 },
      checks: c => {
        const seq = c.frames.map(f => (c.same(f.px, c.img('HEART')) ? 'H' : c.same(f.px, c.img('HEART_SMALL')) ? 's' : null)).filter(Boolean);
        let changes = 0;
        for (let i = 1; i < seq.length; i++) if (seq[i] !== seq[i - 1]) changes++;
        return [
          { ok: seq.includes('H') && seq.includes('s'), text: 'Je toont Image.HEART en Image.HEART_SMALL' },
          { ok: changes >= 9, text: 'Het hart klopt minstens 5 keer (' + Math.floor((changes + 1) / 2) + ' keer gezien)' },
          { ok: c.uses(/\b(for|while)\b/), text: 'Je gebruikt een lus' },
        ];
      },
    },
    {
      id: 'm4', chapter: 1, title: 'Aftellen',
      story: 'Raket klaar voor lancering! 5… 4… 3… 2… 1…',
      goal: 'Tel af van <b>5 tot 1</b> (elk cijfer 1 seconde) en toon daarna een <b>afbeelding</b>. Bonus: <b>max. 5 regels</b>.',
      concept: {
        title: 'Achteruit tellen met range',
        html: 'In <code>for i in range(5, 0, -1):</code> krijgt <code>i</code> de waarden 5, 4, 3, 2, 1: start bij 5, stop vóór 0, telkens -1. <code>display.show(i)</code> toont het getal dat in <code>i</code> zit.',
        example: 'for i in range(5, 0, -1):\n    display.show(i)\n    sleep(1000)',
      },
      commands: ['for i in range(5, 0, -1):\n    ', 'display.show(i)', 'sleep(1000)', 'display.show(Image.YES)'],
      starter: IMPORT + '\n',
      maxLines: 5,
      hints: ['Gebruik een for-lus met <code>range(5, 0, -1)</code>.', 'Na de lus (niet ingesprongen): <code>display.show(Image.YES)</code>.'],
      test: { duration: 12000 },
      checks: c => {
        const want = ['5', '4', '3', '2', '1'];
        const digits = c.shows.filter(e => /^\d$/.test(e.text));
        let k = 0, times = [];
        for (const e of digits) { if (k < 5 && e.text === want[k]) { times.push(e.t); k++; } }
        const inOrder = k === 5;
        let paused = inOrder;
        for (let i = 1; i < times.length; i++) if (times[i] - times[i - 1] < 300) paused = false;
        const t1 = inOrder ? times[4] : Infinity;
        const imgAfter = c.frames.some(f => f.t >= t1 && f.kind === 'image' && f.px.some(v => v > 0));
        return [
          { ok: inOrder, text: 'De cijfers 5, 4, 3, 2, 1 verschijnen na elkaar' },
          { ok: paused, text: 'Elk cijfer blijft even staan (sleep)' },
          { ok: imgAfter, text: 'Daarna verschijnt een afbeelding' },
        ];
      },
    },
    {
      id: 'm5', chapter: 2, title: 'Knop A of B?',
      story: 'Je micro:bit krijgt gevoelens: knop A maakt hem blij, knop B maakt hem verdrietig.',
      goal: 'Knop <b>A</b> → <code>Image.HAPPY</code>, knop <b>B</b> → <code>Image.SAD</code>. Bonus: <b>max. 6 regels</b>.',
      concept: {
        title: 'while True en knoppen',
        html: '<code>while True:</code> herhaalt voor altijd (zoals <i>de hele tijd</i> in MakeCode). <code>button_a.is_pressed()</code> is <code>True</code> zolang knop A ingedrukt is. <code>elif</code> betekent "anders als".',
        example: 'while True:\n    if button_a.is_pressed():\n        display.show(Image.HAPPY)\n    elif button_b.is_pressed():\n        display.show(Image.SAD)',
      },
      commands: ['while True:\n    ', 'if button_a.is_pressed():\n    ', 'elif button_b.is_pressed():\n    ', 'display.show(Image.HAPPY)', 'display.show(Image.SAD)'],
      starter: IMPORT + '\nwhile True:\n    ',
      maxLines: 6,
      hints: ['In de while-lus: als knop A ingedrukt is, toon HAPPY.', 'Daaronder <code>elif button_b.is_pressed():</code> en toon SAD.', 'Test het zelf: klik op ▶ Start en druk op de knoppen van de micro:bit op het scherm (of toets A en B).'],
      test: { duration: 3500, events: [].concat(press('a', 500, 800), press('b', 2000, 800)) },
      checks: c => [
        { ok: c.same(c.at(1250), c.img('HAPPY')), text: 'Bij knop A zie je Image.HAPPY' },
        { ok: c.same(c.at(2750), c.img('SAD')), text: 'Bij knop B zie je Image.SAD' },
      ],
    },
    {
      id: 'm6', chapter: 2, title: 'Teller',
      story: 'Maak een teller: zoals een klikteller om bezoekers te tellen.',
      goal: 'Knop <b>A</b> telt 1 bij en toont het getal. Knop <b>B</b> zet de teller terug op <b>0</b> en toont 0. Bonus: <b>max. 9 regels</b>.',
      concept: {
        title: 'Variabelen',
        html: 'Een <b>variabele</b> is een doosje met een naam waarin je een waarde bewaart. <code>teller = 0</code> maakt het doosje. <code>teller = teller + 1</code> telt er 1 bij. <code>button_a.was_pressed()</code> is <code>True</code> als A ingedrukt werd sinds de vorige keer dat je het vroeg.',
        example: 'teller = 0\nwhile True:\n    if button_a.was_pressed():\n        teller = teller + 1\n        display.show(teller)',
      },
      commands: ['teller = 0', 'while True:\n    ', 'if button_a.was_pressed():\n    ', 'if button_b.was_pressed():\n    ', 'teller = teller + 1', 'display.show(teller)'],
      starter: IMPORT + 'teller = 0\n',
      maxLines: 9,
      hints: ['Gebruik <code>was_pressed()</code>, niet <code>is_pressed()</code>: anders telt hij heel snel door zolang je drukt.', 'Voor knop B: <code>teller = 0</code> en dan <code>display.show(teller)</code>.'],
      test: { duration: 3500, events: [].concat(press('a', 500), press('a', 900), press('a', 1300), press('b', 2000), press('a', 2600)) },
      checks: c => [
        { ok: c.lastTextBefore(1850) === '3', text: 'Na 3 keer op A toont hij 3' },
        { ok: c.lastTextBefore(2550) === '0', text: 'Knop B zet de teller op 0' },
        { ok: c.lastTextBefore(3300) === '1', text: 'Daarna telt A weer verder vanaf 0 (1)' },
      ],
    },
    {
      id: 'm7', chapter: 2, title: 'Dobbelsteen',
      story: 'Vergeten de dobbelsteen mee te brengen naar het gezelschapsspel? Geen probleem!',
      goal: 'Bij elke keer <b>schudden</b> verschijnt een willekeurig getal van <b>1 tot 6</b>. Bonus: <b>max. 5 regels</b>.',
      concept: {
        title: 'random en schudden',
        html: '<code>import random</code> geeft je toevalsgetallen. <code>random.randint(1, 6)</code> kiest een geheel getal van 1 tot en met 6. <code>accelerometer.was_gesture("shake")</code> is <code>True</code> als de micro:bit geschud werd.',
        example: 'import random\ngetal = random.randint(1, 6)\ndisplay.show(getal)',
      },
      commands: ['import random', 'while True:\n    ', 'if accelerometer.was_gesture("shake"):\n    ', 'display.show(random.randint(1, 6))'],
      starter: IMPORT + 'import random\n\n',
      maxLines: 5,
      hints: ['In een <code>while True:</code>-lus: als er geschud werd, toon een random getal.', 'Probeer het met de knop <b>🫨 Schud</b> onder de micro:bit.'],
      test: { duration: 13000, events: Array.from({ length: 12 }, (_, i) => ({ t: 600 + i * 1000, type: 'shake' })) },
      checks: c => {
        const nums = c.texts.map(e => ({ t: e.t, n: e.text.trim() }));
        const good = nums.filter(e => /^[1-6]$/.test(e.n));
        const bad = nums.filter(e => /^-?\d+$/.test(e.n) && !/^[1-6]$/.test(e.n));
        const distinct = new Set(good.map(e => e.n)).size;
        const early = nums.some(e => /^\d+$/.test(e.n) && e.t < 600);
        return [
          { ok: good.length >= 10, text: 'Na het schudden verschijnt een getal (' + good.length + ' keer bij 12 keer schudden)' },
          { ok: bad.length === 0 && good.length > 0, text: 'De getallen liggen tussen 1 en 6' },
          { ok: distinct >= 3, text: 'De getallen zijn willekeurig (random)' },
          { ok: !early, text: 'Er verschijnt pas een getal ná het schudden' },
        ];
      },
    },
    {
      id: 'm8', chapter: 2, title: 'Waterpas',
      story: 'Bouw een waterpas: de micro:bit wijst aan naar welke kant hij overhelt.',
      goal: 'Kantel je naar <b>links</b>: <code>Image.ARROW_W</code>. Naar <b>rechts</b>: <code>Image.ARROW_E</code>. <b>Plat</b>: maak het scherm <b>leeg</b>. Bonus: <b>max. 9 regels</b>.',
      concept: {
        title: 'De versnellingsmeter',
        html: '<code>accelerometer.get_x()</code> geeft een getal: negatief als je naar links kantelt, positief naar rechts, ongeveer 0 als hij plat ligt. Bewaar het in een variabele en vergelijk met <code>&lt;</code> en <code>&gt;</code>.',
        example: 'x = accelerometer.get_x()\nif x < -300:\n    display.show(Image.ARROW_W)',
      },
      commands: ['while True:\n    ', 'x = accelerometer.get_x()', 'if x < -300:\n    ', 'elif x > 300:\n    ', 'else:\n    ', 'display.show(Image.ARROW_W)', 'display.show(Image.ARROW_E)', 'display.clear()'],
      starter: IMPORT + '\nwhile True:\n    x = accelerometer.get_x()\n',
      maxLines: 9,
      hints: ['Gebruik if / elif / else met <code>x &lt; -300</code> en <code>x &gt; 300</code>.', 'Probeer het met de kantelknoppen ⬅ ➡ onder de micro:bit.'],
      test: {
        duration: 4200,
        events: [
          { t: 1000, type: 'tilt', x: -700, y: 0, z: -700, gesture: 'left' },
          { t: 2000, type: 'tilt', x: 700, y: 0, z: -700, gesture: 'right' },
          { t: 3000, type: 'tilt', x: 0, y: 0, z: -1024, gesture: 'face up' },
        ],
      },
      checks: c => [
        { ok: c.same(c.at(1900), c.img('ARROW_W')), text: 'Naar links gekanteld: pijl naar links' },
        { ok: c.same(c.at(2900), c.img('ARROW_E')), text: 'Naar rechts gekanteld: pijl naar rechts' },
        { ok: c.at(3900).every(v => v === 0), text: 'Plat: het scherm is leeg' },
      ],
    },
    {
      id: 'm9', chapter: 3, title: 'De diagonaal',
      story: 'Elk lampje heeft een plaats: x (van links naar rechts, 0 tot 4) en y (van boven naar onder, 0 tot 4).',
      goal: 'Teken een schuine lijn van linksboven (0, 0) tot rechtsonder (4, 4). Bonus: <b>max. 3 regels</b>.',
      concept: {
        title: 'display.set_pixel(x, y, helderheid)',
        html: '<code>display.set_pixel(2, 0, 9)</code> zet het lampje op x=2, y=0 aan met helderheid 9 (0 = uit, 9 = felst). Op de diagonaal zijn x en y telkens even groot…',
        example: 'display.set_pixel(0, 0, 9)\ndisplay.set_pixel(1, 1, 9)',
      },
      commands: ['for i in range(5):\n    ', 'display.set_pixel(0, 0, 9)', 'display.set_pixel(i, i, 9)'],
      starter: IMPORT + 'display.set_pixel(0, 0, 9)\n',
      maxLines: 3,
      hints: ['Gebruik een for-lus: <code>i</code> wordt 0, 1, 2, 3, 4.', '<code>display.set_pixel(i, i, 9)</code> in de lus.'],
      test: { duration: 3000 },
      checks: c => {
        const diag = [0, 6, 12, 18, 24];
        return [
          { ok: diag.every(i => c.final[i] > 0), text: 'Alle 5 lampjes van de diagonaal branden' },
          { ok: c.final.every((v, i) => diag.includes(i) || v === 0), text: 'De andere lampjes zijn uit' },
        ];
      },
    },
    {
      id: 'm10', chapter: 3, title: 'Dambord',
      story: 'Een dambord: om en om een lampje aan en uit. De hoeken branden.',
      goal: 'Zet elk lampje aan waar <code>x + y</code> een <b>even</b> getal is. Gebruik <b>twee for-lussen</b> en <code>set_pixel</code>. Bonus: <b>max. 5 regels</b>.',
      concept: {
        title: 'Lus in een lus, en %',
        html: 'Met een lus in een lus overloop je alle 25 lampjes. <code>%</code> geeft de rest van een deling: <code>(x + y) % 2 == 0</code> is waar als <code>x + y</code> even is.',
        example: 'for x in range(5):\n    for y in range(5):\n        display.set_pixel(x, y, 5)',
      },
      commands: ['for x in range(5):\n    ', 'for y in range(5):\n    ', 'if (x + y) % 2 == 0:\n    ', 'display.set_pixel(x, y, 9)'],
      starter: IMPORT + '\n',
      maxLines: 5,
      hints: ['Eerst <code>for x in range(5):</code>, daarin <code>for y in range(5):</code>.', 'In de binnenste lus: <code>if (x + y) % 2 == 0:</code> en dan set_pixel.'],
      test: { duration: 3000 },
      checks: c => {
        const want = []; for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) want.push((x + y) % 2 === 0);
        const sets = c.log.filter(e => e.type === 'set_pixel').length;
        return [
          { ok: c.final.every((v, i) => (want[i] ? v > 0 : v === 0)), text: 'Het dambord-patroon klopt (hoeken aan)' },
          { ok: sets >= 13 && c.uses(/\bfor\b[\s\S]*\bfor\b/), text: 'Je tekent met set_pixel in twee for-lussen' },
        ];
      },
    },
    {
      id: 'm11', chapter: 4, title: 'Vrije speelzone', free: true,
      story: 'Hier mag je alles proberen! Gebruik knoppen, schudden, kantelen, de temperatuur, getallen, afbeeldingen…',
      goal: 'Maak je eigen programma en zet het op een <b>echte micro:bit</b> met de knop hieronder.',
      concept: {
        title: 'Spiekbriefje',
        html: '<code>display.show(Image.DUCK)</code>, <code>display.scroll("Hoi")</code>, <code>display.clear()</code>, <code>display.set_pixel(x, y, 9)</code>, <code>Image("09090:99999:99999:09990:00900")</code><br>' +
          '<code>button_a.is_pressed()</code>, <code>button_b.was_pressed()</code>, <code>button_a.get_presses()</code><br>' +
          '<code>accelerometer.was_gesture("shake")</code>, <code>accelerometer.get_x()</code>, <code>temperature()</code>, <code>running_time()</code>, <code>sleep(1000)</code>',
        example: 'while True:\n    if button_a.was_pressed():\n        display.scroll(temperature())\n    if accelerometer.was_gesture("shake"):\n        display.show(Image.SURPRISED)',
      },
      commands: ['while True:\n    ', 'display.show(Image.DUCK)', 'display.scroll("Hoi")', 'display.scroll(temperature())', 'Image("09090:99999:99999:09990:00900")', 'sleep(1000)', 'import random', 'running_time()'],
      starter: IMPORT + '\n# Eigen afbeelding: elk cijfer is een lampje (0 = uit, 9 = fel)\nkat = Image("90009:99999:90909:99999:09990")\n\nwhile True:\n    if button_a.was_pressed():\n        display.show(kat)\n    if button_b.was_pressed():\n        display.scroll(temperature())\n    if accelerometer.was_gesture("shake"):\n        display.show(Image.SURPRISED)\n',
      maxLines: 99,
      hints: ['Kijk naar het spiekbriefje rechts. Alles van de vorige levels mag je combineren!'],
    },
  ];

  window.MB_CHAPTERS = chapters;
  window.MB_LEVELS = levels;
  window.mbMakeCtx = makeCtx;
})();
