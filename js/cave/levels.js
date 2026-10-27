/*
 * Levels van het Grot-avontuur.
 * Kaarttekens:  #  muur     .  vloer     O  gat     *  kristal
 *               E  uitgang  H  held (start)
 * Een level kan meerdere kaarten (varianten) hebben: de code moet op elke kaart werken.
 */
(function () {
  'use strict';

  /**
   * Maak een kaart van een pad. moves: R L U D (1 stap), J (spring naar rechts over een gat).
   * crystals: lijst van stapnummers waar een kristal ligt.
   */
  function pathMap(moves, crystals) {
    crystals = crystals || [];
    let x = 0, y = 0;
    const cells = [{ x: 0, y: 0, c: 'H' }];
    const holes = [];
    let step = 0;
    for (const m of moves) {
      if (m === 'J') { holes.push({ x: x + 1, y: y }); x += 2; }
      else if (m === 'R') x++;
      else if (m === 'L') x--;
      else if (m === 'U') y--;
      else if (m === 'D') y++;
      step++;
      cells.push({ x: x, y: y, c: crystals.includes(step) ? '*' : '.' });
    }
    cells[cells.length - 1].c = 'E';
    const all = cells.concat(holes);
    const minX = Math.min(...all.map(c => c.x)) - 1, maxX = Math.max(...all.map(c => c.x)) + 1;
    const minY = Math.min(...all.map(c => c.y)) - 1, maxY = Math.max(...all.map(c => c.y)) + 1;
    const grid = [];
    for (let r = minY; r <= maxY; r++) grid.push(new Array(maxX - minX + 1).fill('#'));
    holes.forEach(h => { grid[h.y - minY][h.x - minX] = 'O'; });
    // Later bezochte vakjes niet overschrijven met een eerder teken (H blijft H)
    for (let i = cells.length - 1; i >= 0; i--) {
      const c = cells[i];
      const cur = grid[c.y - minY][c.x - minX];
      if (cur === '#' || i === 0) grid[c.y - minY][c.x - minX] = c.c;
    }
    return grid.map(r => r.join(''));
  }

  /** Gang naar rechts met gaten: 'H..O.*E' -> één rij met muren rond. */
  function corridor(s) {
    const w = '#'.repeat(s.length + 2);
    return [w, '#' + s + '#', w];
  }

  function jumpOrWalk(segments) {
    // elk segment is 2 vakjes: 'O*' (gat) of '.*' (vloer)
    let s = 'H';
    segments.forEach((hole, i) => {
      const last = i === segments.length - 1;
      s += (hole ? 'O' : '.') + (last ? 'E' : '*');
    });
    return corridor(s);
  }

  const chapters = [
    { id: 1, icon: '👣', title: 'Hoofdstuk 1 – Commando\'s', sub: 'Geef je held één voor één opdrachten.' },
    { id: 2, icon: '🔢', title: 'Hoofdstuk 2 – Argumenten', sub: 'Een getal tussen de haakjes: hoeveel stappen?' },
    { id: 3, icon: '🔁', title: 'Hoofdstuk 3 – For-lussen', sub: 'Herhaal stukjes code zonder ze opnieuw te typen.' },
    { id: 4, icon: '🔀', title: 'Hoofdstuk 4 – Als … anders (if/else)', sub: 'Laat je held kijken en zelf beslissen.' },
    { id: 5, icon: '♾️', title: 'Hoofdstuk 5 – While-lussen', sub: 'Herhaal zolang iets waar is.' },
    { id: 6, icon: '🧩', title: 'Hoofdstuk 6 – Eigen functies (def)', sub: 'Maak je eigen commando\'s.' },
  ];

  const MOVES = ['move_right()', 'move_left()', 'move_up()', 'move_down()'];

  const levels = [
    {
      id: 'c1', chapter: 1, title: 'Eerste stappen',
      story: 'Je held Kai is in een donkere grot beland. Gelukkig zie je de uitgang al!',
      goal: 'Breng Kai naar de <b>uitgang</b> (de groene deur).',
      concept: {
        title: 'Een commando',
        html: 'Net zoals een blok in Scratch geef je in Python een <b>commando</b>. Je schrijft de naam, gevolgd door haakjes <code>()</code>. Elk commando komt op een nieuwe regel.',
        example: 'move_right()\nmove_right()',
      },
      commands: ['move_right()'],
      starter: '# Klik op Start om je code uit te voeren\nmove_right()\n',
      maxLines: 4,
      hints: ['Kai moet 4 vakjes naar rechts.', 'Schrijf 4 keer <code>move_right()</code>, elk op een eigen regel.'],
      maps: [[
        '#######',
        '#H...E#',
        '#######',
      ]],
    },
    {
      id: 'c2', chapter: 1, title: 'Om de hoek',
      story: 'De gang maakt een bocht. Onderweg schittert een kristal.',
      goal: 'Raap het <b>kristal</b> op en ga naar de uitgang.',
      concept: {
        title: 'Meer richtingen',
        html: 'Er zijn vier stap-commando\'s: <code>move_right()</code>, <code>move_left()</code>, <code>move_up()</code> en <code>move_down()</code>. Kristallen raap je op door erop te stappen.',
        example: 'move_right()\nmove_down()',
      },
      commands: MOVES,
      starter: 'move_right()\n',
      maxLines: 6,
      hints: ['Eerst 2 keer naar rechts, dan 2 keer naar beneden, dan nog 2 keer naar rechts.'],
      maps: [[
        '#######',
        '#H..###',
        '###*###',
        '###..E#',
        '#######',
      ]],
    },
    {
      id: 'c3', chapter: 1, title: 'Kristallenjacht',
      story: 'Deze grot ligt vol kristallen. Laat er geen enkele liggen!',
      goal: 'Raap <b>alle 3 kristallen</b> op en ga naar de uitgang.',
      concept: {
        title: 'Terug naar links',
        html: 'Soms moet je terugkeren. Gebruik daarvoor <code>move_left()</code>. Denk eerst na over de route en schrijf dan de commando\'s.',
        example: 'move_left()',
      },
      commands: MOVES,
      starter: '',
      maxLines: 10,
      hints: ['Ga eerst naar rechts tot onder de opening, dan naar beneden.', 'Beneden: eerst één stap naar rechts voor het kristal, daarna helemaal naar links naar de uitgang.'],
      maps: [[
        '########',
        '#H.*..##',
        '####.###',
        '#E.*.*##',
        '########',
      ]],
    },
    {
      id: 'c4', chapter: 1, title: 'Spring!',
      story: 'Diepe gaten! Wie daarin valt, moet opnieuw beginnen.',
      goal: 'Spring over de <b>gaten</b> en bereik de uitgang.',
      concept: {
        title: 'Springen',
        html: '<code>jump_right()</code> laat Kai één vakje overslaan: hij springt over het vakje naast hem en landt twee vakjes verder. Over een muur springen lukt niet!',
        example: 'jump_right()',
      },
      commands: ['move_right()', 'jump_right()'],
      starter: 'move_right()\n',
      maxLines: 4,
      hints: ['Stap eerst tot vlak voor het gat. Spring dan.', 'move_right(), jump_right(), jump_right(), move_right()'],
      maps: [[
        '#########',
        '#H.O*O.E#',
        '#########',
      ]],
    },
    {
      id: 'c5', chapter: 2, title: 'Grote stappen',
      story: 'Een lange gang. Al die move_right()-regels worden wel erg veel typwerk…',
      goal: 'Raap het kristal op en ga naar de uitgang in <b>maximaal 3 regels</b>.',
      concept: {
        title: 'Argumenten',
        html: 'Tussen de haakjes mag je een <b>getal</b> zetten: dat noemen we een <b>argument</b>. <code>move_right(5)</code> zet 5 stappen naar rechts.',
        example: 'move_right(5)\nmove_down(2)',
      },
      commands: ['move_right(3)', 'move_left(3)', 'move_up(3)', 'move_down(3)'],
      starter: 'move_right(3)\n',
      maxLines: 3,
      hints: ['Tel de vakjes tot het kristal: dat zijn er 8.', 'move_right(8), move_down(2), move_left(8)'],
      maps: [[
        '###########',
        '#H.......*#',
        '#########.#',
        '#E........#',
        '###########',
      ]],
    },
    {
      id: 'c6', chapter: 2, title: 'Het slakkenhuis',
      story: 'Deze gang draait als een slakkenhuis naar binnen.',
      goal: 'Raap de 2 kristallen op en vind de uitgang in het midden. Bonus: <b>maximaal 7 regels</b>.',
      concept: {
        title: 'Tellen',
        html: 'Tel telkens hoeveel vakjes Kai in één richting moet lopen en gebruik dat getal als argument.',
        example: 'move_down(6)',
      },
      commands: ['move_right(3)', 'move_left(3)', 'move_up(3)', 'move_down(3)'],
      starter: '',
      maxLines: 7,
      hints: ['Begin met move_right(8) en daarna move_down(6).', 'Daarna: move_left(8), move_up(4), move_right(6), move_down(2), move_left(4).'],
      maps: [[
        '###########',
        '#H.......*#',
        '#########.#',
        '#.*.....#.#',
        '#.#####.#.#',
        '#.#E....#.#',
        '#.#######.#',
        '#.........#',
        '###########',
      ]],
    },
    {
      id: 'c7', chapter: 3, title: 'De trap',
      story: 'Een trap naar beneden, met op elke trede een kristal.',
      goal: 'Raap alle kristallen op en ga naar de uitgang. Bonus: <b>maximaal 4 regels</b> met een <code>for</code>-lus.',
      concept: {
        title: 'De for-lus',
        html: 'Een <code>for</code>-lus herhaalt code, zoals het blok <i>herhaal 4 keer</i> in Scratch. Alles wat <b>inspringt</b> (4 spaties of Tab) onder de regel met de dubbelpunt <code>:</code> wordt herhaald.',
        example: 'for i in range(4):\n    move_right()\n    move_down()',
      },
      commands: ['for i in range(4):\n    ', ...MOVES],
      starter: 'for i in range(4):\n    move_right()\n',
      maxLines: 4,
      hints: ['Het patroon is: één stap rechts, één stap omlaag. Dat 4 keer.', 'Na de lus is er nog één move_right() nodig. Die regel springt NIET in.'],
      maps: [[
        '########',
        '#H*#####',
        '##.*####',
        '###.*###',
        '####.*##',
        '#####.E#',
        '########',
      ]],
    },
    {
      id: 'c8', chapter: 3, title: 'De gatenrij',
      story: 'Een gang vol gaten, telkens op dezelfde afstand.',
      goal: 'Raap alle kristallen en ga naar de uitgang. Bonus: <b>maximaal 4 regels</b>.',
      concept: {
        title: 'Een patroon herhalen',
        html: 'Zoek het <b>patroon</b>: welke commando\'s komen telkens terug? Zet die in een for-lus. <code>range(4)</code> betekent: 4 keer.',
        example: 'for i in range(4):\n    move_right()\n    jump_right()',
      },
      commands: ['for i in range(4):\n    ', 'move_right()', 'jump_right()'],
      starter: '',
      maxLines: 4,
      hints: ['Het patroon is: stap, spring.', 'Na de lus nog één stap naar rechts.'],
      maps: [corridor('H.O*.O*.O*.O*E')],
    },
    {
      id: 'c9', chapter: 3, title: 'De kristalkam',
      story: 'Vier smalle gangetjes naar boven, met bovenaan telkens een kristal.',
      goal: 'Raap alle 4 kristallen en ga naar de uitgang. Bonus: <b>maximaal 4 regels</b>.',
      concept: {
        title: 'Lus met argumenten',
        html: 'In een lus mag je ook commando\'s met argumenten zetten. Probeer eerst één "tand" van de kam met commando\'s, en herhaal dat dan.',
        example: 'for i in range(4):\n    move_up(2)',
      },
      commands: ['for i in range(4):\n    ', 'move_up(2)', 'move_down(2)', 'move_right(2)'],
      starter: '',
      maxLines: 4,
      hints: ['Eén tand: move_up(2), move_down(2), move_right(2).', 'Zet die 3 commando\'s in een for-lus die 4 keer herhaalt.'],
      maps: [[
        '###########',
        '#*#*#*#*###',
        '#.#.#.#.###',
        '#H.......E#',
        '###########',
      ]],
    },
    {
      id: 'c10', chapter: 4, title: 'Springen of lopen?',
      story: 'De gaten liggen telkens op een andere plaats! Kai moet zelf kijken.',
      goal: 'Bereik de uitgang op <b>alle 3 kaarten</b> met dezelfde code. Bonus: <b>maximaal 5 regels</b>.',
      concept: {
        title: 'if / else',
        html: 'Met <code>if</code> laat je Kai iets controleren. <code>hole_right()</code> is <code>True</code> (waar) als er rechts een gat is. Is het niet waar, dan wordt het <code>else</code>-deel uitgevoerd. Let op de dubbelpunten en de inspringing!',
        example: 'if hole_right():\n    jump_right()\nelse:\n    move_right(2)',
      },
      commands: ['for i in range(4):\n    ', 'if hole_right():\n    jump_right()\nelse:\n    move_right(2)', 'move_right(2)', 'jump_right()', 'hole_right()'],
      starter: 'for i in range(4):\n    ',
      maxLines: 5,
      hints: ['Elk stukje is 2 vakjes lang: ofwel een gat + vloer, ofwel 2 keer vloer.', 'In de lus: als er een gat is, spring; anders move_right(2).'],
      maps: [
        jumpOrWalk([1, 0, 1, 0]),
        jumpOrWalk([0, 1, 1, 0]),
        jumpOrWalk([1, 0, 0, 1]),
      ],
    },
    {
      id: 'c11', chapter: 4, title: 'Links of rechts?',
      story: 'Onderaan de schacht is de uitgang soms links, soms rechts.',
      goal: 'Bereik de uitgang op <b>beide kaarten</b> met dezelfde code. Bonus: <b>maximaal 5 regels</b>.',
      concept: {
        title: 'Muren voelen',
        html: '<code>wall_left()</code> is <code>True</code> als er links van Kai een muur is. Er zijn ook <code>wall_right()</code>, <code>wall_up()</code> en <code>wall_down()</code>.',
        example: 'if wall_left():\n    move_right(2)\nelse:\n    move_left(2)',
      },
      commands: ['move_down(3)', 'if wall_left():\n    \nelse:\n    ', 'move_left(2)', 'move_right(2)', 'wall_left()'],
      starter: 'move_down(3)\n',
      maxLines: 5,
      hints: ['Ga eerst 3 vakjes naar beneden.', 'Als er links een muur is, moet je naar rechts. Anders naar links.'],
      maps: [
        ['#######', '###H###', '###.###', '###*###', '#E..###', '#######'],
        ['#######', '###H###', '###.###', '###*###', '###..E#', '#######'],
      ],
    },
    {
      id: 'c12', chapter: 5, title: 'Hoe ver nog?',
      story: 'De gang is telkens anders lang. Tellen helpt hier niet…',
      goal: 'Bereik de uitgang op <b>alle 3 kaarten</b>. Bonus: <b>maximaal 2 regels</b>.',
      concept: {
        title: 'De while-lus',
        html: 'Een <code>while</code>-lus herhaalt <b>zolang</b> iets waar is. <code>at_exit()</code> is waar als Kai bij de uitgang staat. <code>not</code> draait waar en niet-waar om. Dus: zolang Kai <i>niet</i> bij de uitgang is, stap verder.',
        example: 'while not at_exit():\n    move_right()',
      },
      commands: ['while not at_exit():\n    ', 'move_right()', 'at_exit()'],
      starter: '',
      maxLines: 2,
      hints: ['Gebruik <code>while not at_exit():</code> en zet daaronder (ingesprongen) één stap.'],
      maps: [corridor('H..E'), corridor('H*....E'), corridor('H..*......E')],
    },
    {
      id: 'c13', chapter: 5, title: 'Gaten onderweg',
      story: 'Lange gangen, met gaten op onverwachte plaatsen.',
      goal: 'Bereik de uitgang op <b>alle 3 kaarten</b> en raap de kristallen op. Bonus: <b>maximaal 5 regels</b>.',
      concept: {
        title: 'while + if',
        html: 'Je mag een <code>if</code> binnen een <code>while</code> zetten. Let op: alles in de if springt nóg 4 spaties verder in.',
        example: 'while not at_exit():\n    if hole_right():\n        jump_right()\n    else:\n        move_right()',
      },
      commands: ['while not at_exit():\n    ', 'if hole_right():\n    \nelse:\n    ', 'move_right()', 'jump_right()', 'hole_right()'],
      starter: '',
      maxLines: 5,
      hints: ['Zolang je niet bij de uitgang bent: kijk of er rechts een gat is.', 'Is er een gat: spring. Anders: één stap.'],
      maps: [corridor('H.*O.O...O*E'), corridor('H.O*.E'), corridor('HO.O*O.O..O*E')],
    },
    {
      id: 'c14', chapter: 5, title: 'De trap op',
      story: 'Een trap naar boven, maar de treden zijn telkens anders.',
      goal: 'Bereik de uitgang op <b>alle 3 kaarten</b>. Bonus: <b>maximaal 5 regels</b>.',
      concept: {
        title: 'Slim klimmen',
        html: 'Staat er rechts een muur? Klim dan één vakje omhoog. Anders: stap naar rechts. Herhaal tot je bij de uitgang bent.',
        example: 'if wall_right():\n    move_up()\nelse:\n    move_right()',
      },
      commands: ['while not at_exit():\n    ', 'if wall_right():\n    \nelse:\n    ', 'move_up()', 'move_right()', 'wall_right()'],
      starter: '',
      maxLines: 5,
      hints: ['Gebruik een while-lus met daarin een if/else.', 'if wall_right(): move_up() — else: move_right()'],
      maps: [
        pathMap('RRURRURRUUR', [3, 6, 9]),
        pathMap('RUUURRRRUR', [4, 8]),
        pathMap('RRRRURURURR', [5, 7, 9]),
      ],
    },
    {
      id: 'c15', chapter: 6, title: 'Rotsen beklimmen',
      story: 'Grote rotsblokken versperren de weg. Kai moet er telkens op dezelfde manier overheen klimmen.',
      goal: 'Raap de kristallen en bereik de uitgang. Bonus: <b>maximaal 10 regels</b> — maak je eigen functie!',
      concept: {
        title: 'Eigen functie met def',
        html: 'Met <code>def</code> maak je zelf een nieuw commando (zoals <i>Maak een blok</i> in Scratch). De ingesprongen regels eronder zijn wat het commando doet. Daarna kan je het gebruiken zoals elk ander commando.',
        example: 'def klim():\n    move_up()\n    move_right(2)\n    move_down()\n\nklim()',
      },
      commands: ['def klim():\n    ', 'klim()', 'move_up()', 'move_down()', 'move_right()', 'move_right(2)'],
      starter: 'def klim():\n    move_up()\n    # wat moet er nog gebeuren?\n\n',
      maxLines: 10,
      hints: ['Over een rots: move_up(), move_right(2), move_down().', 'Volgorde: 1 stap, klim, 2 stappen, klim, klim, 2 stappen.'],
      maps: [[
        '##############',
        '##.*.#.*.*.###',
        '#H.#...#.#..E#',
        '##############',
      ]],
    },
    {
      id: 'c16', chapter: 6, title: 'Bergen van elke maat',
      story: 'Drie bergen: klein, groot en middelgroot. Eén functie voor allemaal?',
      goal: 'Raap de kristallen op de toppen en ga naar de uitgang. Bonus: <b>maximaal 8 regels</b>.',
      concept: {
        title: 'Functie met parameter',
        html: 'Een functie kan ook een <b>parameter</b> krijgen: een naam tussen de haakjes die een getal onthoudt. Bij <code>berg(3)</code> wordt <code>hoogte</code> gelijk aan 3.',
        example: 'def berg(hoogte):\n    move_up(hoogte)\n    move_right(hoogte)\n    move_down(hoogte)\n    move_right(hoogte)\n\nberg(1)',
      },
      commands: ['def berg(hoogte):\n    ', 'berg(1)', 'move_up(hoogte)', 'move_down(hoogte)', 'move_right(hoogte)'],
      starter: 'def berg(hoogte):\n    move_up(hoogte)\n\n',
      maxLines: 8,
      hints: ['Een berg: omhoog, naar rechts, omlaag, naar rechts — telkens even veel als de hoogte.', 'De bergen zijn 1, 3 en 2 hoog.'],
      maps: [pathMap('URDR' + 'UUURRRDDDRRR' + 'UURRDDRR', [1, 7, 18])],
    },
  ];

  window.CAVE_CHAPTERS = chapters;
  window.CAVE_LEVELS = levels;
  window.cavePathMap = pathMap;
})();
