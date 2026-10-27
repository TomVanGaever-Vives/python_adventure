/*
 * Grot-avontuur: koppelt levels, editor, Python-runner en de grotwereld.
 */
(function () {
  'use strict';

  const GAME = 'cave';
  const LEVELS = window.CAVE_LEVELS;
  const CHAPTERS = window.CAVE_CHAPTERS;
  const SPEEDS = [700, 450, 280, 150, 60];
  const FAST_MS = 35;
  const MAX_ACTIONS = 300;

  const COMMAND_INFO = {
    'move_right()': 'stap naar rechts', 'move_left()': 'stap naar links', 'move_up()': 'stap naar boven', 'move_down()': 'stap naar beneden',
    'jump_right()': 'spring over het vakje rechts', 'jump_left()': 'spring over het vakje links',
    'wall_right()': 'is er rechts een muur?', 'wall_left()': 'is er links een muur?', 'wall_up()': 'is er boven een muur?', 'wall_down()': 'is er onder een muur?',
    'hole_right()': 'is er rechts een gat?', 'hole_left()': 'is er links een gat?', 'hole_up()': 'is er boven een gat?', 'hole_down()': 'is er onder een gat?',
    'at_exit()': 'staat Kai op de uitgang?', 'distance_right()': 'hoeveel vakjes vrij naar rechts?', 'say("Hallo")': 'Kai zegt iets', 'print("Hallo")': 'schrijf tekst in de uitvoer',
  };

  const API_NAMES = ['move_right', 'move_left', 'move_up', 'move_down', 'jump_right', 'jump_left',
    'wall_right', 'wall_left', 'wall_up', 'wall_down', 'hole_right', 'hole_left', 'hole_up', 'hole_down', 'at_exit', 'distance_right', 'say'];
  const PY_NAMES = ['print', 'range', 'for', 'while', 'if', 'else', 'elif', 'def', 'not', 'and', 'or', 'True', 'False', 'in', 'str', 'int', 'len', 'return'];

  const $ = id => document.getElementById(id);

  let level = null, variant = 0, world = null, renderer = null, editor = null, runner = null, con = null;
  let actions = 0, lastLine = null, fastMode = false, running = false;

  function stepMs() { return fastMode ? FAST_MS : SPEEDS[Number($('speed').value) - 1]; }

  function setRunning(on) {
    running = on;
    document.body.classList.toggle('is-running', on);
    $('btn-run').disabled = on;
    $('btn-stop').disabled = !on;
    $('btn-reset').disabled = on;
    editor.setOption('readOnly', on ? 'nocursor' : false);
    document.querySelectorAll('#variants button').forEach(b => { b.disabled = on; });
  }

  // ---------- Python-commando's ----------

  function count(name, args) {
    if (args.length > 1) throw new Sk.builtin.TypeError(name + '() krijgt maar één getal tussen de haakjes, bv. ' + name + '(3)');
    const n = args[0];
    if (n === undefined) return 1;
    if (typeof n !== 'number' || !Number.isInteger(n)) throw new Sk.builtin.TypeError(name + '() verwacht een geheel getal tussen de haakjes, bv. ' + name + '(3)');
    if (n < 0) throw new Sk.builtin.ValueError(name + '() kan geen negatief aantal stappen zetten.');
    return n;
  }

  function noArgs(name, args) {
    if (args.length > 0 && args[0] !== undefined) throw new Sk.builtin.TypeError(name + '() heeft geen getal nodig: laat de haakjes leeg.');
  }

  function gameOver(title, text) {
    runner.stop('gameover', { title: title, text: text, line: lastLine });
    throw runner.stopSignal;
  }

  function countAction() {
    actions++;
    if (actions > MAX_ACTIONS) gameOver('Oneindige lus?', 'Kai heeft al meer dan ' + MAX_ACTIONS + ' stappen gezet. Stopt je lus wel ooit?');
  }

  async function doSteps(dir, n) {
    for (let i = 0; i < n; i++) {
      countAction();
      const from = { x: world.hero.x, y: world.hero.y };
      const res = world.tryStep(dir);
      const ms = stepMs();
      if (res.ok) {
        renderer.animate('move', from, res.to, ms);
        await runner.wait(ms);
        renderer.endAnim();
        if (world.moveHero(res.to)) { renderer.sparkle(res.to.x, res.to.y); updateHud(); }
      } else if (res.kind === 'bump') {
        renderer.animate('bump', from, res.to, ms * 1.5 + 150);
        await runner.wait(ms * 1.5 + 150);
        renderer.endAnim();
        gameOver('Au, een muur!', 'Kai botste tegen een muur. Tel de vakjes nog eens na.');
      } else {
        renderer.animate('fall', from, res.to, ms * 2 + 300);
        await runner.wait(ms * 2 + 300);
        renderer.endAnim();
        world.hero.x = res.to.x; world.hero.y = res.to.y;
        world.status = 'dead';
        gameOver('Oei, in een gat gevallen!', 'Kai viel in een gat. Over een gat moet je springen met <code>jump_right()</code>.');
      }
    }
  }

  async function doJump(dir) {
    countAction();
    const from = { x: world.hero.x, y: world.hero.y };
    const res = world.tryJump(dir);
    const ms = Math.round(stepMs() * 1.6);
    if (res.ok) {
      renderer.animate('jump', from, res.to, ms);
      await runner.wait(ms);
      renderer.endAnim();
      if (world.moveHero(res.to)) { renderer.sparkle(res.to.x, res.to.y); updateHud(); }
    } else if (res.kind === 'bump' || res.kind === 'bumpjump') {
      renderer.animate('bump', from, res.kind === 'bump' ? res.to : { x: from.x + (res.to.x - from.x) / 2, y: from.y + (res.to.y - from.y) / 2 }, ms + 150);
      await runner.wait(ms + 150);
      renderer.endAnim();
      gameOver('Au, een muur!', res.kind === 'bump' ? 'Over een muur kan Kai niet springen.' : 'Kai zou tegen een muur landen.');
    } else {
      const a = { x: from.x, y: from.y };
      renderer.animate('fall', a, res.to, ms * 2 + 300);
      renderer.anim.jumped = true;
      await runner.wait(ms * 2 + 300);
      renderer.endAnim();
      world.hero.x = res.to.x; world.hero.y = res.to.y;
      world.status = 'dead';
      gameOver('Oei, in een gat gevallen!', 'Kai landde midden in een gat. Spring je niet te ver?');
    }
  }

  function makeBuiltins() {
    const b = {};
    ['right', 'left', 'up', 'down'].forEach(dir => {
      b['move_' + dir] = function () { const n = count('move_' + dir, Array.from(arguments)); return doSteps(dir, n); };
      b['wall_' + dir] = function () { noArgs('wall_' + dir, Array.from(arguments)); return world.look(dir, 'wall'); };
      b['hole_' + dir] = function () { noArgs('hole_' + dir, Array.from(arguments)); return world.look(dir, 'hole'); };
    });
    b.jump_right = function () { noArgs('jump_right', Array.from(arguments)); return doJump('right'); };
    b.jump_left = function () { noArgs('jump_left', Array.from(arguments)); return doJump('left'); };
    b.distance_right = function () { noArgs('distance_right', Array.from(arguments)); return world.distance('right'); };
    b.at_exit = function () { noArgs('at_exit', Array.from(arguments)); return world.atExit(); };
    b.say = function (text) {
      const ms = Math.max(700, stepMs() * 3);
      renderer.say(text === undefined ? '' : (typeof text === 'object' ? JSON.stringify(text) : text), ms);
      return runner.wait(ms);
    };
    return b;
  }

  // ---------- Level laden ----------

  function openLevel(id) {
    const lv = LEVELS.find(l => l.id === id) || LEVELS[0];
    if (runner && runner.running) runner.stop('stop');
    level = lv;
    $('map-view').hidden = true;
    $('level-view').hidden = false;
    if (location.hash !== '#' + lv.id) history.replaceState(null, '', '#' + lv.id);
    const idx = LEVELS.indexOf(lv);
    const ch = CHAPTERS.find(c => c.id === lv.chapter);
    $('lv-chapter').textContent = ch.icon + ' ' + ch.title;
    $('lv-title').textContent = 'Level ' + (idx + 1) + ': ' + lv.title;
    $('lv-story').textContent = lv.story;
    $('lv-goal').innerHTML = '🎯 ' + lv.goal;
    $('concept-title').textContent = lv.concept.title;
    $('concept-html').innerHTML = lv.concept.html;
    $('concept-ex').textContent = lv.concept.example;
    $('bonus-max').textContent = lv.maxLines;
    renderPalette(lv);
    const saved = Store.code(GAME, lv.id);
    editor.setValue(saved !== null ? saved : lv.starter);
    editor.clearHistory();
    editor.clearMarks();
    con.clear();
    UI.showMessage($('message'), 'info', 'Schrijf je code en klik op <b>▶ Start</b>.');
    hintIdx = 0;
    renderVariants();
    selectVariant(0);
    updateLineCount();
    updateNav();
    setTimeout(() => editor.refresh(), 0);
  }

  function renderPalette(lv) {
    const pal = $('palette');
    pal.innerHTML = '';
    lv.commands.forEach(c => {
      const label = c.split('\n')[0].replace(/\s+$/, '');
      const info = COMMAND_INFO[c] || (c.startsWith('for') ? 'herhaal' : c.startsWith('while') ? 'herhaal zolang' : c.startsWith('if') ? 'als … anders' : c.startsWith('def') ? 'maak een functie' : '');
      pal.appendChild(UI.el('button', { class: 'chip', title: info + ' (klik om in te voegen)', onclick: () => UI.insertSnippet(editor, c) }, [
        UI.el('code', { text: label }), info ? UI.el('small', { text: info }) : null,
      ]));
    });
  }

  function renderVariants() {
    const box = $('variants');
    box.innerHTML = '';
    if (level.maps.length < 2) { box.hidden = true; return; }
    box.hidden = false;
    box.appendChild(UI.el('span', { text: 'Kaarten:' }));
    level.maps.forEach((m, i) => {
      box.appendChild(UI.el('button', { class: 'variant-btn', 'data-v': i, onclick: () => { if (!running) selectVariant(i); } }, ['Kaart ' + (i + 1)]));
    });
    box.appendChild(UI.el('small', { text: 'Je code moet op elke kaart werken!' }));
  }

  function selectVariant(i) {
    variant = i;
    world = new CaveWorld(level.maps[i]);
    renderer.setWorld(world);
    document.querySelectorAll('#variants .variant-btn').forEach(b => b.classList.toggle('active', Number(b.dataset.v) === i));
    updateHud();
  }

  function updateHud() {
    if (!world) return;
    const parts = [];
    if (world.totalCrystals) parts.push('💎 ' + world.collected + ' / ' + world.totalCrystals);
    if (level.maps.length > 1) parts.push('🗺 kaart ' + (variant + 1) + ' / ' + level.maps.length);
    $('hud').textContent = parts.join('   ·   ');
  }

  function updateLineCount() {
    if (!level) return;
    const n = countCodeLines(editor.getValue());
    $('line-count').textContent = n;
    $('line-info').classList.toggle('ok', n > 0 && n <= level.maxLines);
  }

  function updateNav() {
    const idx = LEVELS.indexOf(level);
    $('btn-prev').disabled = idx <= 0;
    $('btn-next').disabled = idx >= LEVELS.length - 1;
  }

  let hintIdx = 0;
  function showHint() {
    const hints = level.hints || [];
    if (!hints.length) return;
    const h = hints[Math.min(hintIdx, hints.length - 1)];
    UI.showMessage($('message'), 'hint', '💡 <b>Hint ' + (Math.min(hintIdx, hints.length - 1) + 1) + '/' + hints.length + ':</b> ' + h);
    hintIdx++;
  }

  // ---------- Uitvoeren ----------

  async function runOnce(code) {
    actions = 0;
    lastLine = null;
    world.reset();
    renderer.setWorld(world);
    updateHud();
    const res = await runner.run(code, { builtins: makeBuiltins(), execLimit: 4000 });
    editor.markRunLine(null);
    if (res.status === 'error') {
      const fe = friendlyError(res.error, code, API_NAMES.concat(PY_NAMES));
      return { ok: false, error: fe };
    }
    if (res.status === 'stopped') {
      if (res.signal.reason === 'gameover') {
        const i = res.signal.info;
        return { ok: false, error: { line: i.line, title: i.title, text: i.text } };
      }
      return { ok: false, stopped: true };
    }
    const missing = world.left.size;
    if (!world.atExit()) {
      return { ok: false, error: { title: 'Nog niet bij de uitgang', text: 'Je programma is klaar, maar Kai staat nog niet op de uitgang.' + (missing ? ' En er liggen nog ' + missing + ' kristal(len).' : '') } };
    }
    if (missing) {
      return { ok: false, error: { title: 'Kristallen vergeten', text: 'Kai is bij de uitgang, maar er ' + (missing === 1 ? 'ligt nog 1 kristal' : 'liggen nog ' + missing + ' kristallen') + '. Raap ze allemaal op!' } };
    }
    return { ok: true };
  }

  async function run() {
    if (running) return;
    const code = editor.getValue();
    Store.saveCode(GAME, level.id, code);
    editor.clearMarks();
    con.clear();
    const warns = lintWarnings(code, API_NAMES);
    if (warns.length) {
      UI.showMessage($('message'), 'warn', '<div class="msg-title">Regel ' + warns[0].line + ': opgelet</div>' + warns[0].text);
      editor.markErrorLine(warns[0].line);
      return;
    }
    UI.showMessage($('message'), 'info', '▶ Kai voert je code uit…');
    setRunning(true);
    let result = null;
    try {
      for (let i = 0; i < level.maps.length; i++) {
        fastMode = i > 0;
        selectVariant(i);
        if (i > 0) {
          UI.showMessage($('message'), 'info', '✔ Kaart ' + i + ' gelukt! Nu kaart ' + (i + 1) + ' testen…');
          await new Promise(r => setTimeout(r, 400));
        }
        const r = await runOnce(code);
        if (!r.ok) { result = r; result.variant = i; break; }
      }
    } finally {
      fastMode = false;
      setRunning(false);
    }
    if (!result) return success(code);
    if (result.stopped) {
      UI.showMessage($('message'), 'info', '■ Gestopt. Klik op <b>↺</b> om opnieuw te beginnen.');
      return;
    }
    const e = result.error;
    if (level.maps.length > 1 && result.variant > 0) {
      e.text = '<b>Op kaart ' + (result.variant + 1) + '</b> lukte het niet. ' + e.text + ' Je code moet op elke kaart werken: ' + (level.variantTip || 'laat Kai zelf kijken met <code>if</code> of <code>while</code>.');
    }
    UI.showError($('message'), e);
    if (e.line) editor.markErrorLine(e.line);
  }

  function success(code) {
    const lines = countCodeLines(code);
    const bonus = lines <= level.maxLines;
    Store.markDone(GAME, level.id, bonus);
    const idx = LEVELS.indexOf(level);
    const next = LEVELS[idx + 1];
    UI.showMessage($('message'), 'success', '🎉 <b>Gelukt!</b> ' + (bonus ? '★ Bonus ook gehaald!' : 'Bonus: probeer het met maximaal ' + level.maxLines + ' regels.'));
    renderer.animate('win', world.hero, world.hero, 1200);
    for (let i = 0; i < 3; i++) setTimeout(() => renderer.sparkle(world.hero.x, world.hero.y), i * 250);
    UI.showModal({
      icon: bonus ? '🏆' : '🎉',
      title: 'Level gehaald!',
      html: '<p class="result-line done">✔ Kai is bij de uitgang' + (world.totalCrystals ? ' met alle kristallen' : '') + '.</p>' +
        '<p class="result-line ' + (bonus ? 'done' : 'todo') + '">' + (bonus ? '★ Bonus: je gebruikte maar ' + lines + ' regel' + (lines === 1 ? '' : 's') + ' (max. ' + level.maxLines + ').' :
          '☆ Bonus: je gebruikte ' + lines + ' regels. Lukt het met maximaal ' + level.maxLines + '?') + '</p>',
      buttons: [
        next ? { label: 'Volgend level ➜', cls: 'primary', action: () => openLevel(next.id) } : { label: 'Naar de levelkaart', cls: 'primary', action: showMap },
        { label: bonus ? 'Blijf hier' : 'Bonus proberen', action: () => {} },
      ],
    });
  }

  function stop() { if (runner.running) runner.stop('stop'); }

  // ---------- Levelkaart ----------

  function showMap() {
    if (runner && runner.running) runner.stop('stop');
    $('level-view').hidden = true;
    $('map-view').hidden = false;
    history.replaceState(null, '', location.pathname + location.search);
    UI.renderLevelMap($('level-map'), CHAPTERS, LEVELS, Store.progress(GAME), openLevel);
    const p = Store.progress(GAME);
    const done = LEVELS.filter(l => p[l.id] && p[l.id].done).length;
    const bonus = LEVELS.filter(l => p[l.id] && p[l.id].bonus).length;
    $('map-progress').textContent = done + ' van ' + LEVELS.length + ' levels gehaald · ' + bonus + ' bonussterren';
  }

  function showReference() {
    const rows = Object.keys(COMMAND_INFO).map(k => '<tr><td><code>' + escapeHtml(k) + '</code></td><td>' + COMMAND_INFO[k] + '</td></tr>').join('');
    UI.showModal({
      title: '📖 Alle commando\'s',
      cls: 'wide',
      html: '<table class="ref">' + rows + '</table><p>Je kan een getal meegeven aan de stap-commando\'s: <code>move_right(3)</code>.</p>' +
        '<p><b>Sneltoets:</b> Ctrl+Enter = Start. <b>Tab</b> = inspringen (4 spaties).</p>',
    });
  }

  function init() {
    con = UI.makeConsole($('console'));
    runner = new PyRunner({
      onOutput: t => con.write(t),
      onLine: n => { lastLine = n; if (!fastMode) editor.markRunLine(n); },
    });
    renderer = new CaveRenderer($('cave'));
    editor = UI.createEditor($('editor'), {
      onRun: run,
      onChange: code => { if (level && !running) { Store.saveCode(GAME, level.id, code); } updateLineCount(); },
    });
    const sp = Store.setting('speed', 3);
    $('speed').value = sp;
    $('speed').addEventListener('input', () => Store.saveSetting('speed', Number($('speed').value)));
    $('btn-run').addEventListener('click', run);
    $('btn-stop').addEventListener('click', stop);
    $('btn-reset').addEventListener('click', () => { selectVariant(variant); editor.clearMarks(); UI.showMessage($('message'), 'info', 'Klaar om opnieuw te proberen.'); });
    $('btn-hint').addEventListener('click', showHint);
    $('btn-ref').addEventListener('click', showReference);
    $('btn-map').addEventListener('click', showMap);
    $('btn-map2').addEventListener('click', showMap);
    $('btn-prev').addEventListener('click', () => openLevel(LEVELS[LEVELS.indexOf(level) - 1].id));
    $('btn-next').addEventListener('click', () => openLevel(LEVELS[LEVELS.indexOf(level) + 1].id));
    $('btn-starter').addEventListener('click', () => {
      UI.showModal({
        title: 'Startcode terugzetten?', html: 'Je huidige code voor dit level wordt gewist.',
        buttons: [{ label: 'Ja, wis mijn code', cls: 'danger', action: () => { editor.setValue(level.starter); } }, { label: 'Nee' }],
      });
    });
    $('btn-reset-all').addEventListener('click', () => {
      UI.showModal({
        title: 'Alles wissen?', html: 'Alle voortgang en code van het Grot-avontuur op deze computer wordt gewist.',
        buttons: [{ label: 'Ja, wis alles', cls: 'danger', action: () => { Store.resetGame(GAME); showMap(); } }, { label: 'Nee' }],
      });
    });
    window.addEventListener('resize', () => renderer.resize());
    setRunning(false);
    const id = location.hash.replace('#', '');
    if (id && LEVELS.some(l => l.id === id)) openLevel(id); else showMap();

    // Haakje voor automatische tests
    window.caveTest = {
      levels: LEVELS.map(l => l.id),
      open: openLevel,
      setCode: c => editor.setValue(c),
      run: async () => { await run(); return { message: $('message').className, text: $('message').innerText }; },
    };
  }

  document.addEventListener('DOMContentLoaded', init);
})();
