/*
 * micro:bit-lab: virtuele micro:bit, levels met automatische controle en .hex-export.
 */
(function () {
  'use strict';

  const GAME = 'microbit';
  const LEVELS = window.MB_LEVELS;
  const CHAPTERS = window.MB_CHAPTERS;
  const $ = id => document.getElementById(id);

  const KNOWN = ['display', 'Image', 'button_a', 'button_b', 'accelerometer', 'sleep', 'running_time', 'temperature', 'random', 'microbit',
    'show', 'scroll', 'clear', 'set_pixel', 'get_pixel', 'is_pressed', 'was_pressed', 'get_presses', 'get_x', 'get_y', 'get_z',
    'was_gesture', 'is_gesture', 'current_gesture', 'randint', 'print', 'range', 'True', 'False', 'str', 'int', 'len', 'while', 'for', 'if', 'else', 'elif', 'import', 'from']
    .concat(Object.keys(window.MB_IMAGES));
  const FUNCS = ['display.clear', 'display.show', 'display.scroll', 'sleep', 'running_time', 'temperature',
    'button_a.is_pressed', 'button_a.was_pressed', 'button_b.is_pressed', 'button_b.was_pressed', 'accelerometer.get_x'];

  let level = null, editor = null, runner = null, con = null, leds = [];
  let mode = 'idle';   // idle | live | test

  // ---------- Virtuele micro:bit ----------

  function buildBoard() {
    const board = $('mb-board');
    const grid = board.querySelector('.mb-leds');
    for (let i = 0; i < 25; i++) {
      const d = document.createElement('div');
      d.className = 'mb-led';
      grid.appendChild(d);
      leds.push(d);
    }
    MBHost.onDisplay = drawLeds;
    drawLeds(new Array(25).fill(0));

    const btn = (id, el) => {
      const down = e => { e.preventDefault(); el.classList.add('pressed'); MBHost.press(id, true); };
      const up = () => { el.classList.remove('pressed'); MBHost.press(id, false); };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointerleave', up);
    };
    btn('a', $('mb-btn-a'));
    btn('b', $('mb-btn-b'));
    $('mb-logo').addEventListener('pointerdown', () => { MBHost.touch.logo = true; });
    $('mb-logo').addEventListener('pointerup', () => { MBHost.touch.logo = false; });

    document.addEventListener('keydown', e => {
      if (e.target.closest && (e.target.closest('.CodeMirror') || e.target.tagName === 'INPUT')) return;
      const k = e.key.toLowerCase();
      if ((k === 'a' || k === 'b') && !e.repeat) { $('mb-btn-' + k).classList.add('pressed'); MBHost.press(k, true); }
    });
    document.addEventListener('keyup', e => {
      const k = e.key.toLowerCase();
      if (k === 'a' || k === 'b') { $('mb-btn-' + k).classList.remove('pressed'); MBHost.press(k, false); }
    });

    $('btn-shake').addEventListener('click', () => {
      MBHost.shake();
      board.classList.remove('shaking');
      void board.offsetWidth;
      board.classList.add('shaking');
    });
    const tilts = {
      left: [-700, 0, -700, 'left'], right: [700, 0, -700, 'right'], up: [0, -700, -700, 'up'], down: [0, 700, -700, 'down'], flat: [0, 0, -1024, 'face up'],
    };
    document.querySelectorAll('.tilt-pad button').forEach(b => {
      b.addEventListener('click', () => {
        const t = tilts[b.dataset.tilt];
        MBHost.tilt(t[0], t[1], t[2], t[3]);
        document.querySelectorAll('.tilt-pad button').forEach(o => o.classList.toggle('active', o === b));
        board.style.transform = { left: 'rotate(-8deg)', right: 'rotate(8deg)', up: 'perspective(600px) rotateX(14deg)', down: 'perspective(600px) rotateX(-14deg)', flat: '' }[b.dataset.tilt];
      });
    });
    $('temp').addEventListener('input', () => {
      MBHost.liveTemp = Number($('temp').value);
      MBHost.temp = MBHost.liveTemp;
      $('temp-val').textContent = $('temp').value + ' °C';
    });
    $('light').addEventListener('input', () => {
      MBHost.liveLight = Number($('light').value);
      MBHost.lightLevel = MBHost.liveLight;
    });
  }

  function drawLeds(px) {
    for (let i = 0; i < 25; i++) {
      const v = px[i] || 0;
      const d = leds[i];
      if (!v) { d.style.background = ''; d.style.boxShadow = ''; continue; }
      const a = 0.25 + (v / 9) * 0.75;
      d.style.background = 'rgba(255,' + Math.round(40 + v * 6) + ',40,' + a + ')';
      d.style.boxShadow = '0 0 ' + (4 + v * 1.4) + 'px rgba(255,60,40,' + (v / 9) + ')';
    }
  }

  // ---------- Levels ----------

  function openLevel(id) {
    const lv = LEVELS.find(l => l.id === id) || LEVELS[0];
    stopAll();
    level = lv;
    $('map-view').hidden = true;
    $('level-view').hidden = false;
    if (location.hash !== '#' + lv.id) history.replaceState(null, '', '#' + lv.id);
    const ch = CHAPTERS.find(c => c.id === lv.chapter);
    const idx = LEVELS.indexOf(lv);
    $('lv-chapter').textContent = ch.icon + ' ' + ch.title;
    $('lv-title').textContent = lv.free ? lv.title : 'Level ' + (idx + 1) + ': ' + lv.title;
    $('lv-story').textContent = lv.story;
    $('lv-goal').innerHTML = '🎯 ' + lv.goal;
    $('concept-title').textContent = lv.concept.title;
    $('concept-html').innerHTML = lv.concept.html;
    $('concept-ex').textContent = lv.concept.example;
    $('bonus-max').textContent = lv.maxLines;
    $('line-info').hidden = !!lv.free;
    $('btn-check').hidden = !!lv.free;
    const pal = $('palette');
    pal.innerHTML = '';
    lv.commands.forEach(c => {
      pal.appendChild(UI.el('button', { class: 'chip', title: 'klik om in te voegen', onclick: () => UI.insertSnippet(editor, c) }, [UI.el('code', { text: c.split('\n')[0].trim() })]));
    });
    const saved = Store.code(GAME, lv.id);
    editor.setValue(saved !== null ? saved : lv.starter);
    editor.clearHistory();
    editor.clearMarks();
    editor.setCursor(editor.lineCount(), 0);
    con.clear();
    hintIdx = 0;
    UI.showMessage($('message'), 'info', lv.free ? 'Klik op <b>▶ Start</b> om je programma te testen op de virtuele micro:bit.' :
      'Klik op <b>▶ Start</b> om te proberen, en op <b>✔ Controleer</b> om te kijken of de opdracht gelukt is.');
    drawLeds(new Array(25).fill(0));
    updateLineCount();
    $('btn-prev').disabled = idx <= 0;
    $('btn-next').disabled = idx >= LEVELS.length - 1;
    setTimeout(() => editor.refresh(), 0);
  }

  function updateLineCount() {
    if (!level) return;
    const n = countCodeLines(editor.getValue());
    $('line-count').textContent = n;
    $('line-info').classList.toggle('ok', n > 0 && n <= level.maxLines);
  }

  let hintIdx = 0;
  function showHint() {
    const hints = level.hints || [];
    if (!hints.length) return;
    const i = Math.min(hintIdx, hints.length - 1);
    UI.showMessage($('message'), 'hint', '💡 <b>Hint ' + (i + 1) + '/' + hints.length + ':</b> ' + hints[i]);
    hintIdx++;
  }

  // ---------- Uitvoeren ----------

  function setMode(m) {
    mode = m;
    document.body.classList.toggle('is-running', m === 'live');
    $('btn-run').disabled = m !== 'idle';
    $('btn-stop').disabled = m !== 'live';
    $('btn-check').disabled = m === 'test';
  }

  function stopAll() {
    if (runner && runner.running) runner.stop('stop');
  }

  function preflight(code) {
    if (!/^\s*from\s+microbit\s+import\s+\*/m.test(code) && !/^\s*import\s+microbit/m.test(code)) {
      UI.showMessage($('message'), 'warn', '<div class="msg-title">Opgelet</div>Begin je programma met <code>from microbit import *</code> (op een echte micro:bit is dat ook nodig).');
      editor.markErrorLine(1);
      return false;
    }
    const warns = lintWarnings(code, FUNCS);
    if (warns.length) {
      UI.showMessage($('message'), 'warn', '<div class="msg-title">Regel ' + warns[0].line + ': opgelet</div>' + warns[0].text);
      editor.markErrorLine(warns[0].line);
      return false;
    }
    return true;
  }

  async function runLive() {
    if (mode !== 'idle') return;
    const code = editor.getValue();
    Store.saveCode(GAME, level.id, code);
    editor.clearMarks();
    con.clear();
    if (!preflight(code)) return;
    UI.showMessage($('message'), 'info', '▶ Je programma loopt op de virtuele micro:bit. Druk op de knoppen, schud of kantel!');
    MBHost.reset('live');
    setMode('live');
    const res = await runner.run(code, {});
    setMode('idle');
    editor.markRunLine(null);
    if (res.status === 'error') {
      const fe = friendlyError(res.error, code, KNOWN);
      UI.showError($('message'), fe);
      if (fe.line) editor.markErrorLine(fe.line);
      return;
    }
    if (res.status === 'stopped') {
      UI.showMessage($('message'), 'info', '■ Gestopt.' + (level.free ? '' : ' Klik op <b>✔ Controleer</b> om de opdracht te laten nakijken.'));
      return;
    }
    if (level.free) { UI.showMessage($('message'), 'info', '✔ Je programma is klaar.'); return; }
    await runCheck(true);
  }

  async function runCheck(auto) {
    if (level.free) return;
    if (mode === 'live') {
      runner.stop('stop');
      for (let i = 0; i < 40 && mode !== 'idle'; i++) await new Promise(r => setTimeout(r, 25));
    }
    if (mode !== 'idle') return;
    const code = editor.getValue();
    Store.saveCode(GAME, level.id, code);
    if (!auto) { editor.clearMarks(); if (!preflight(code)) return; }
    UI.showMessage($('message'), 'info', '🔎 Bezig met nakijken…');
    MBHost.reset('test', level.test);
    setMode('test');
    const res = await runner.run(code, { execLimit: 4000 });
    setMode('idle');
    editor.markRunLine(null);
    if (res.status === 'error') {
      const fe = friendlyError(res.error, code, KNOWN);
      if (fe.type === 'TimeLimitError') {
        fe.title = 'Lus zonder pauze';
        fe.text = 'Je <code>while</code>-lus draait de hele tijd zonder te wachten, iets te tonen of naar een knop te kijken. Zet er bijvoorbeeld <code>sleep(100)</code> in.';
      }
      UI.showError($('message'), fe);
      if (fe.line) editor.markErrorLine(fe.line);
      return;
    }
    if (res.status === 'stopped' && res.signal.reason !== 'testdone') {
      UI.showMessage($('message'), 'info', '■ Nakijken gestopt.');
      return;
    }
    const ctx = mbMakeCtx(MBHost.log, code);
    let results;
    try { results = level.checks(ctx); } catch (e) { results = [{ ok: false, text: 'Kon niet nakijken: ' + e.message }]; }
    const allOk = results.every(r => r.ok);
    const list = '<ul class="check-list">' + results.map(r => '<li class="' + (r.ok ? 'ok' : 'bad') + '">' + r.text + '</li>').join('') + '</ul>';
    if (!allOk) {
      UI.showMessage($('message'), 'error', '<div class="msg-title">Nog niet helemaal…</div>' + list +
        (level.test.events && level.test.events.length ? '<div class="mb-help">Bij het nakijken worden de knoppen, het schudden of kantelen automatisch nagedaan.</div>' : ''));
      return;
    }
    const lines = countCodeLines(code);
    const bonus = lines <= level.maxLines;
    Store.markDone(GAME, level.id, bonus);
    UI.showMessage($('message'), 'success', '🎉 <b>Gelukt!</b> ' + list);
    const next = LEVELS[LEVELS.indexOf(level) + 1];
    UI.showModal({
      icon: bonus ? '🏆' : '🎉',
      title: 'Opdracht gelukt!',
      html: '<p class="result-line done">✔ ' + results.length + ' van ' + results.length + ' controles in orde.</p>' +
        '<p class="result-line ' + (bonus ? 'done' : 'todo') + '">' + (bonus ? '★ Bonus: ' + lines + ' regels (max. ' + level.maxLines + ').' : '☆ Bonus: je gebruikte ' + lines + ' regels. Lukt het met maximaal ' + level.maxLines + '?') + '</p>' +
        '<p>Tip: zet je programma op een echte micro:bit met <b>⬇ Zet op micro:bit</b>.</p>',
      buttons: [
        next ? { label: 'Volgend level ➜', cls: 'primary', action: () => openLevel(next.id) } : { label: 'Naar de levelkaart', cls: 'primary', action: showMap },
        { label: 'Blijf hier' },
      ],
    });
  }

  // ---------- Echte micro:bit ----------

  async function toHex() {
    const code = editor.getValue();
    if (!/^\s*from\s+microbit\s+import\s+\*/m.test(code) && !/^\s*import\s+microbit/m.test(code)) {
      UI.showModal({ title: 'Opgelet', html: 'Begin je programma met <code>from microbit import *</code>.' });
      return;
    }
    const btn = $('btn-hex');
    btn.disabled = true;
    btn.textContent = '⏳ Even geduld…';
    try {
      const hex = await MBHex.buildUniversalHex(code);
      const name = 'microbit-' + (level.free ? 'mijn-programma' : level.id + '-' + level.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')) + '.hex';
      MBHex.download(name, hex);
      window.lastHex = { name: name, size: hex.length, hex: hex };
      UI.showModal({
        icon: '⬇️', title: 'Je .hex-bestand is klaar!', cls: 'wide',
        html: '<p>Het bestand <b>' + escapeHtml(name) + '</b> staat in je map <b>Downloads</b>. Zo zet je het op de micro:bit:</p>' +
          '<ol><li>Sluit de micro:bit met een USB-kabel aan op de Chromebook.</li>' +
          '<li>Open de app <b>Bestanden</b> en ga naar <b>Downloads</b>.</li>' +
          '<li>Sleep het .hex-bestand naar de schijf <b>MICROBIT</b> (links in de lijst).</li>' +
          '<li>Het gele lampje achteraan knippert. Wacht tot het stopt: je programma start vanzelf!</li></ol>' +
          '<p class="mb-help">Werkt op micro:bit V1 en V2. Muziek hoor je enkel op een V2 (of met een luidspreker).</p>',
      });
    } catch (e) {
      UI.showModal({ title: 'Dat lukte niet', html: 'Het .hex-bestand kon niet gemaakt worden: ' + escapeHtml(e.message || e) });
    } finally {
      btn.disabled = false;
      btn.textContent = '⬇ Zet op micro:bit';
    }
  }

  async function copyCode() {
    const code = editor.getValue();
    let ok = false;
    try { await navigator.clipboard.writeText(code); ok = true; } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = code; document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      ta.remove();
    }
    UI.showModal({
      icon: ok ? '📋' : '⚠️',
      title: ok ? 'Code gekopieerd!' : 'Kopiëren lukte niet',
      html: ok ? '<p>Open de officiële editor <a href="https://python.microbit.org/v/3" target="_blank" rel="noopener">python.microbit.org</a>, wis de code die er staat (Ctrl+A) en plak jouw code (Ctrl+V).</p>'
        : '<p>Selecteer je code in de editor (Ctrl+A) en kopieer ze (Ctrl+C).</p>',
    });
  }

  // ---------- Levelkaart ----------

  function showMap() {
    stopAll();
    $('level-view').hidden = true;
    $('map-view').hidden = false;
    history.replaceState(null, '', location.pathname + location.search);
    const p = Store.progress(GAME);
    UI.renderLevelMap($('level-map'), CHAPTERS, LEVELS, p, openLevel);
    const real = LEVELS.filter(l => !l.free);
    const done = real.filter(l => p[l.id] && p[l.id].done).length;
    const bonus = real.filter(l => p[l.id] && p[l.id].bonus).length;
    $('map-progress').textContent = done + ' van ' + real.length + ' levels gehaald · ' + bonus + ' bonussterren';
  }

  function init() {
    con = UI.makeConsole($('console'));
    runner = new PyRunner({
      onOutput: t => { if (mode !== 'test') con.write(t); },
      onLine: n => { if (mode === 'live') editor.markRunLine(n); },
      extraFiles: window.MB_PY_FILES,
    });
    MBHost.runner = runner;
    MBHost.onOutput = t => con.write(t);
    MBHost.reset('live');
    editor = UI.createEditor($('editor'), {
      onRun: runLive,
      onChange: code => { if (level) Store.saveCode(GAME, level.id, code); updateLineCount(); },
    });
    buildBoard();
    setMode('idle');
    $('btn-run').addEventListener('click', runLive);
    $('btn-stop').addEventListener('click', stopAll);
    $('btn-check').addEventListener('click', () => runCheck(false));
    $('btn-hint').addEventListener('click', showHint);
    $('btn-hex').addEventListener('click', toHex);
    $('btn-copy').addEventListener('click', copyCode);
    $('btn-map').addEventListener('click', showMap);
    $('btn-map2').addEventListener('click', showMap);
    $('btn-prev').addEventListener('click', () => openLevel(LEVELS[LEVELS.indexOf(level) - 1].id));
    $('btn-next').addEventListener('click', () => openLevel(LEVELS[LEVELS.indexOf(level) + 1].id));
    $('btn-starter').addEventListener('click', () => {
      UI.showModal({
        title: 'Startcode terugzetten?', html: 'Je huidige code voor dit level wordt gewist.',
        buttons: [{ label: 'Ja, wis mijn code', cls: 'danger', action: () => editor.setValue(level.starter) }, { label: 'Nee' }],
      });
    });
    $('btn-reset-all').addEventListener('click', () => {
      UI.showModal({
        title: 'Alles wissen?', html: 'Alle voortgang en code van het micro:bit-lab op deze computer wordt gewist.',
        buttons: [{ label: 'Ja, wis alles', cls: 'danger', action: () => { Store.resetGame(GAME); showMap(); } }, { label: 'Nee' }],
      });
    });
    const id = location.hash.replace('#', '');
    if (id && LEVELS.some(l => l.id === id)) openLevel(id); else showMap();

    // Haakje voor automatische tests
    window.mbTest = {
      levels: LEVELS.map(l => l.id),
      open: openLevel,
      setCode: c => editor.setValue(c),
      check: async () => { await runCheck(false); return { cls: $('message').className, text: $('message').innerText }; },
      live: () => runLive(),
      stop: stopAll,
      hex: toHex,
      message: () => ({ cls: $('message').className, text: $('message').innerText }),
    };
  }

  document.addEventListener('DOMContentLoaded', init);
})();
