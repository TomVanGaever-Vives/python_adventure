/*
 * Gedeelde hulpjes: opslag (localStorage), editor, levelkaart, popups.
 */
(function () {
  'use strict';

  const PREFIX = 'pyavontuur.';

  const Store = {
    _get(key, fallback) {
      try {
        const v = localStorage.getItem(PREFIX + key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    _set(key, value) {
      try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { /* opslag niet beschikbaar */ }
    },
    progress(game) { return this._get(game + '.progress', {}); },
    markDone(game, levelId, bonus) {
      const p = this.progress(game);
      const old = p[levelId] || {};
      p[levelId] = { done: true, bonus: !!(bonus || old.bonus) };
      this._set(game + '.progress', p);
    },
    code(game, levelId) { return this._get(game + '.code.' + levelId, null); },
    saveCode(game, levelId, code) { this._set(game + '.code.' + levelId, code); },
    setting(name, fallback) { return this._get('setting.' + name, fallback); },
    saveSetting(name, value) { this._set('setting.' + name, value); },
    resetGame(game) {
      try {
        Object.keys(localStorage).filter(k => k.startsWith(PREFIX + game + '.')).forEach(k => localStorage.removeItem(k));
      } catch (e) { /* niets */ }
    },
  };

  function createEditor(host, opts) {
    const cm = CodeMirror(host, {
      value: opts.value || '',
      mode: { name: 'python', version: 3 },
      lineNumbers: true,
      indentUnit: 4,
      tabSize: 4,
      indentWithTabs: false,
      smartIndent: true,
      matchBrackets: true,
      autoCloseBrackets: true,
      styleActiveLine: true,
      lineWrapping: false,
      viewportMargin: Infinity,
      spellcheck: false,
      extraKeys: {
        'Tab': function (cm) {
          if (cm.somethingSelected()) cm.indentSelection('add');
          else cm.replaceSelection('    ', 'end');
        },
        'Shift-Tab': function (cm) { cm.indentSelection('subtract'); },
        'Ctrl-Enter': function () { if (opts.onRun) opts.onRun(); },
        'Cmd-Enter': function () { if (opts.onRun) opts.onRun(); },
      },
    });
    let lineMark = null, errorMark = null;
    cm.markRunLine = function (n) {
      if (lineMark !== null) cm.removeLineClass(lineMark, 'background', 'cm-runline');
      lineMark = null;
      if (n && n <= cm.lineCount()) {
        lineMark = cm.addLineClass(n - 1, 'background', 'cm-runline');
      }
    };
    cm.markErrorLine = function (n) {
      if (errorMark !== null) cm.removeLineClass(errorMark, 'background', 'cm-errorline');
      errorMark = null;
      if (n && n <= cm.lineCount()) {
        errorMark = cm.addLineClass(n - 1, 'background', 'cm-errorline');
        cm.scrollIntoView({ line: n - 1, ch: 0 }, 60);
      }
    };
    cm.clearMarks = function () { cm.markRunLine(null); cm.markErrorLine(null); };
    cm.on('change', function () { cm.markErrorLine(null); if (opts.onChange) opts.onChange(cm.getValue()); });
    return cm;
  }

  /** Voeg een stukje code in op de cursorpositie, met juiste inspringing. */
  function insertSnippet(cm, snippet) {
    const cur = cm.getCursor();
    const lineText = cm.getLine(cur.line);
    const indent = (/^\s*/.exec(lineText) || [''])[0];
    let text = snippet.split('\n').map((l, i) => (i === 0 ? l : indent + l)).join('\n');
    if (lineText.trim().length > 0) {
      // Nieuwe regel onder de huidige
      cm.setCursor({ line: cur.line, ch: lineText.length });
      const extra = /:\s*$/.test(lineText) ? '    ' : '';
      text = '\n' + indent + extra + text.split('\n').map((l, i) => (i === 0 ? l : extra + l)).join('\n');
    }
    cm.replaceSelection(text, 'end');
    cm.focus();
  }

  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        if (k === 'class') e.className = attrs[k];
        else if (k === 'html') e.innerHTML = attrs[k];
        else if (k === 'text') e.textContent = attrs[k];
        else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
        else e.setAttribute(k, attrs[k]);
      }
    }
    (children || []).forEach(c => { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }

  /** Levelkaart: hoofdstukken met tegels; alle levels zijn vrij te kiezen. */
  function renderLevelMap(container, chapters, levels, progress, onPick) {
    container.innerHTML = '';
    const firstOpen = levels.find(l => !(progress[l.id] && progress[l.id].done));
    let n = 0;
    chapters.forEach(ch => {
      const lv = levels.filter(l => l.chapter === ch.id);
      if (!lv.length) return;
      const tiles = lv.map(l => {
        n++;
        const p = progress[l.id] || {};
        const cls = ['level-tile'];
        if (p.done) cls.push('done');
        if (p.bonus) cls.push('bonus');
        if (firstOpen && firstOpen.id === l.id) cls.push('next');
        if (l.free) cls.push('free');
        if (l.challenge) cls.push('challenge');
        if (l.selfWrite) cls.push('selfwrite');
        return el('button', { class: cls.join(' '), onclick: () => onPick(l.id), 'data-level': l.id, title: l.title }, [
          el('span', { class: 'tile-num', text: l.free ? '★' : String(n) }),
          l.challenge ? el('span', { class: 'tile-badge', text: '🔥 uitdaging' }) : l.selfWrite ? el('span', { class: 'tile-badge', text: '✍️ zelf schrijven' }) : null,
          el('span', { class: 'tile-title', text: l.title }),
          el('span', { class: 'tile-stars', html: l.free ? 'vrij spelen' : ((p.done ? '<span class="star on">✔</span>' : '<span class="star">✔</span>') + (p.bonus ? '<span class="star on">★</span>' : '<span class="star">★</span>')) }),
        ]);
      });
      container.appendChild(el('section', { class: 'chapter' }, [
        el('h2', { html: '<span class="ch-icon">' + ch.icon + '</span> ' + escapeHtml(ch.title) }),
        el('p', { class: 'chapter-sub', text: ch.sub || '' }),
        el('div', { class: 'tiles' }, tiles),
      ]));
    });
  }

  function showModal(opts) {
    closeModal();
    const buttons = (opts.buttons || [{ label: 'OK' }]).map(b => el('button', {
      class: 'btn ' + (b.cls || ''),
      onclick: () => { closeModal(); if (b.action) b.action(); },
    }, [b.label]));
    const box = el('div', { class: 'modal ' + (opts.cls || '') }, [
      opts.icon ? el('div', { class: 'modal-icon', text: opts.icon }) : null,
      el('h2', { html: opts.title }),
      el('div', { class: 'modal-body', html: opts.html || '' }),
      el('div', { class: 'modal-buttons' }, buttons),
    ]);
    const overlay = el('div', { class: 'modal-overlay', id: 'modal-overlay' }, [box]);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.body.appendChild(overlay);
    const first = box.querySelector('.modal-buttons .btn');
    if (first) first.focus();
  }

  function closeModal() {
    const o = document.getElementById('modal-overlay');
    if (o) o.remove();
  }

  /** Uitvoer-paneel (print). */
  function makeConsole(elm) {
    return {
      clear() { elm.textContent = ''; elm.classList.remove('has-output'); },
      write(t) {
        elm.classList.add('has-output');
        elm.textContent += t;
        if (elm.textContent.length > 5000) elm.textContent = elm.textContent.slice(-4000);
        elm.scrollTop = elm.scrollHeight;
      },
    };
  }

  function showError(box, fe) {
    box.innerHTML = '<div class="msg-title">' + (fe.line ? 'Regel ' + fe.line + ': ' : '') + fe.title + '</div><div>' + fe.text + '</div>';
    box.className = 'message error';
  }

  function showMessage(box, cls, html) {
    box.innerHTML = html;
    box.className = 'message ' + cls;
  }

  window.Store = Store;
  window.UI = { createEditor, insertSnippet, el, renderLevelMap, showModal, closeModal, makeConsole, showError, showMessage };
})();
