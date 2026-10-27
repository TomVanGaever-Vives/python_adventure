/*
 * Vriendelijke Nederlandstalige foutmeldingen voor Python-fouten uit Skulpt.
 * friendlyError(err, code, knownNames) -> {line, title, text}
 */
(function () {
  'use strict';

  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const d = [];
    for (let i = 0; i <= m; i++) { d[i] = [i]; }
    for (let j = 0; j <= n; j++) { d[0][j] = j; }
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return d[m][n];
  }

  function suggest(name, known) {
    let best = null, bestD = 99;
    const low = name.toLowerCase();
    for (const k of known) {
      const d = levenshtein(low, k.toLowerCase());
      if (d < bestD) { bestD = d; best = k; }
    }
    const limit = name.length <= 4 ? 1 : (name.length <= 8 ? 2 : 3);
    return bestD <= limit ? best : null;
  }

  function pyStr(o) {
    try {
      if (o === undefined || o === null) return '';
      if (typeof o === 'string') return o;
      if (o.v !== undefined && typeof o.v === 'string') return o.v;
      return Sk.misceval.objectRepr(o).v || String(o);
    } catch (e) { return String(o); }
  }

  function errorLine(err) {
    if (err && err.traceback && err.traceback.length) {
      for (const tb of err.traceback) {
        if (tb.filename === window.PY_USER_FILE || tb.filename === '<stdin>.py' || tb.filename === '<stdin>') return tb.lineno;
      }
      return err.traceback[0].lineno;
    }
    // SyntaxError: args = (msg, (bestand, regel, kolom, tekst))
    try {
      const a = err.args.v;
      if (a[1] && a[1].v && a[1].v[1]) return Sk.ffi.remapToJs(a[1].v[1]);
    } catch (e) { /* niets */ }
    return null;
  }

  function message(err) {
    try {
      if (err.args && err.args.v && err.args.v.length) return pyStr(err.args.v[0]);
    } catch (e) { /* niets */ }
    return String(err && err.message || err);
  }

  function typeName(err) {
    if (!err) return 'Fout';
    if (err.tp$name) return err.tp$name;
    if (err.constructor && err.constructor.prototype && err.constructor.prototype.tp$name) return err.constructor.prototype.tp$name;
    return 'Fout';
  }

  const BLOCK_WORDS = ['for', 'while', 'if', 'elif', 'else', 'def'];

  /** Extra hints voor schrijffouten door naar de regel zelf te kijken. */
  function syntaxHint(lineText, allLines, lineNo) {
    const t = (lineText || '').trim();
    const first = t.split(/[\s(:]/)[0];
    if (BLOCK_WORDS.includes(first) && !t.replace(/#.*$/, '').trim().endsWith(':')) {
      return 'Een regel die begint met <code>' + first + '</code> moet eindigen met een dubbelpunt <code>:</code>';
    }
    let open = 0;
    for (const ch of t) { if (ch === '(') open++; if (ch === ')') open--; }
    if (open > 0) return 'Er ontbreekt een sluithaakje <code>)</code>. Tel je haakjes: elk <code>(</code> heeft een <code>)</code> nodig.';
    if (open < 0) return 'Er staat een sluithaakje <code>)</code> te veel.';
    const quotes = (t.match(/"/g) || []).length;
    const squotes = (t.match(/'/g) || []).length;
    if (quotes % 2 === 1 || squotes % 2 === 1) return 'Een tekst moet tussen twee aanhalingstekens staan, bv. <code>"Hallo"</code>. Er ontbreekt er één.';
    if (/^(else|elif)\b/.test(t)) return '<code>' + first + '</code> moet direct onder een <code>if</code>-blok staan, even ver ingesprongen als die <code>if</code>.';
    if (/=\s*=|==/.test(t) === false && /^(if|while|elif)\b.*[^=!<>]=[^=]/.test(t)) return 'Om te vergelijken gebruik je <code>==</code> (twee isgelijktekens), niet <code>=</code>.';
    if (/\b(For|While|If|Else|Def|Print|True:|Range)\b/.test(t)) return 'Let op hoofdletters: Python-woorden zoals <code>for</code>, <code>if</code>, <code>while</code> en <code>print</code> schrijf je met kleine letters.';
    // Vorige regel misschien niet afgesloten
    if (lineNo > 1) {
      const prev = (allLines[lineNo - 2] || '').trim();
      let o = 0;
      for (const ch of prev) { if (ch === '(') o++; if (ch === ')') o--; }
      if (o > 0) return 'Op de regel erboven (regel ' + (lineNo - 1) + ') ontbreekt een sluithaakje <code>)</code>.';
    }
    if (/^\d/.test(t)) return 'Een regel kan niet zomaar met een getal beginnen.';
    return 'Kijk goed naar haakjes <code>( )</code>, dubbelpunten <code>:</code> en aanhalingstekens <code>" "</code>.';
  }

  function indentOf(l) { return (/^\s*/.exec(l) || [''])[0].length; }

  /** Eindigt de vorige (niet-lege) regel met : terwijl deze regel niet inspringt? */
  function needsIndent(lines, line) {
    if (!line || line < 2) return false;
    let i = line - 2;
    while (i >= 0 && lines[i].trim() === '') i--;
    if (i < 0) return false;
    const prev = lines[i].replace(/#.*$/, '').trimEnd();
    return prev.endsWith(':') && indentOf(lines[line - 1] || '') <= indentOf(lines[i]);
  }

  function friendlyError(err, code, knownNames) {
    knownNames = knownNames || [];
    const lines = (code || '').split('\n');
    const type = typeName(err);
    const msg = message(err);
    let line = errorLine(err);
    const lineText = line ? (lines[line - 1] || '') : '';
    let title = 'Er ging iets mis';
    let text = '';

    switch (type) {
      case 'NameError': {
        const m = /name '([^']+)'/.exec(msg);
        const name = m ? m[1] : '?';
        title = 'Onbekend woord';
        text = 'Python kent <code>' + escapeHtml(name) + '</code> niet.';
        const s = suggest(name, knownNames);
        if (s && s !== name) text += ' Bedoel je misschien <code>' + escapeHtml(s) + '</code>?';
        else if (/^[a-zA-Z]+$/.test(name) && knownNames.length) text += ' Controleer de spelling. Is het een <b>variabele</b>? Geef ze dan eerst een waarde, bv. <code>' + escapeHtml(name) + ' = 3</code>, vóór je ze gebruikt. Is het een tekst? Zet hem dan tussen aanhalingstekens: <code>"' + escapeHtml(name) + '"</code>.';
        if (/^(true|false|none)$/.test(name)) text += ' Schrijf <code>' + name.charAt(0).toUpperCase() + name.slice(1) + '</code> met een hoofdletter.';
        break;
      }
      case 'IndentationError':
      case 'TabError': {
        title = 'Inspringing klopt niet';
        if (/unexpected indent/.test(msg)) text = 'Deze regel springt in, maar dat mag hier niet. Zet hem even ver naar links als de regel erboven.';
        else if (/expected an indented block/.test(msg)) text = 'Na een regel die eindigt met <code>:</code> moet de volgende regel inspringen (4 spaties of de Tab-toets).';
        else if (/unindent/.test(msg)) text = 'Deze regel springt niet even ver in als de regels erboven. Gebruik altijd 4 spaties per niveau.';
        else text = 'Kijk of alle regels van een blok even ver inspringen (4 spaties).';
        break;
      }
      case 'SyntaxError': {
        title = 'Schrijffout';
        if (/expected an indented block|unexpected indent|unindent/.test(msg)) {
          title = 'Inspringing klopt niet';
          text = /expected/.test(msg)
            ? 'Na een regel die eindigt met <code>:</code> moet de volgende regel inspringen (4 spaties of de Tab-toets).'
            : 'Deze regel springt niet goed in. Zet hem even ver als de andere regels van hetzelfde blok.';
        } else if (/EOF|end of file|unexpected end|was never closed/i.test(msg)) {
          text = 'Je programma stopt te vroeg. Ontbreekt er ergens een sluithaakje <code>)</code>?';
          const open = lines.findIndex(l => (l.match(/\(/g) || []).length > (l.match(/\)/g) || []).length);
          if (open >= 0) { line = open + 1; text = 'Op deze regel ontbreekt een sluithaakje <code>)</code>.'; }
          else if (!line || line > lines.length) line = lines.length;
        } else if (needsIndent(lines, line)) {
          title = 'Inspringing klopt niet';
          text = 'De regel erboven eindigt met <code>:</code>, dus deze regel moet inspringen (4 spaties of de Tab-toets).';
        } else {
          text = 'Python begrijpt deze regel niet. ' + syntaxHint(lineText, lines, line);
        }
        break;
      }
      case 'TypeError': {
        title = 'Verkeerd soort waarde';
        if (/not callable/.test(msg)) text = 'Je zet haakjes <code>()</code> achter iets dat geen functie is.';
        else if (/takes|positional argument|arguments? \(|argument/.test(msg)) {
          const fm = /^(\w+)\(\)/.exec(msg);
          text = 'Je geeft een verkeerd aantal waarden mee tussen de haakjes' + (fm ? ' van <code>' + fm[1] + '()</code>' : '') + '.';
        } else if (/concatenate|unsupported operand|can only/.test(msg)) text = 'Je probeert tekst en een getal samen te voegen. Gebruik <code>str(getal)</code> om een getal in tekst om te zetten.';
        else if (/cannot be interpreted as an integer|integer/.test(msg)) text = 'Hier moet een geheel getal staan (zoals 3), geen tekst of kommagetal.';
        else text = escapeHtml(msg);
        break;
      }
      case 'TimeLimitError':
        title = 'Oneindige lus?';
        text = 'Je programma blijft maar doorgaan zonder dat er iets gebeurt. Zit er een <code>while</code>-lus in die nooit stopt?';
        break;
      case 'ZeroDivisionError':
        title = 'Delen door nul';
        text = 'Delen door 0 kan niet, ook niet in Python.';
        break;
      case 'ValueError':
        title = 'Verkeerde waarde';
        text = 'Deze waarde past hier niet. (' + escapeHtml(msg) + ')';
        break;
      case 'IndexError':
        title = 'Buiten de lijst';
        text = 'Je vraagt een plaats op die niet bestaat (te groot getal?).';
        break;
      case 'AttributeError': {
        const m = /'(\w+)' object has no attribute '(\w+)'|has no attribute '(\w+)'/.exec(msg);
        const attr = m ? (m[2] || m[3]) : null;
        title = 'Onbekende functie of eigenschap';
        text = attr ? 'Dit ding heeft geen <code>' + escapeHtml(attr) + '</code>. Controleer de spelling.' : escapeHtml(msg);
        if (attr) {
          const s = suggest(attr, knownNames);
          if (s && s !== attr) text += ' Bedoel je <code>' + escapeHtml(s) + '</code>?';
          else if (/^[A-Z_]+$/.test(attr)) text += ' Ingebouwde afbeeldingen hebben Engelse namen, bv. <code>Image.HEART</code>, <code>Image.HAPPY</code>, <code>Image.SAD</code>, <code>Image.DUCK</code>.';
        }
        break;
      }
      case 'ImportError':
      case 'ModuleNotFoundError':
        title = 'Importeren lukt niet';
        text = 'Deze module bestaat hier niet. Schrijf bovenaan: <code>from microbit import *</code>';
        break;
      case 'RecursionError':
      case 'InternalError':
        title = 'Te diep';
        text = 'Een functie roept zichzelf te vaak aan.';
        break;
      default:
        if (err && err.gameMessage) { title = err.gameTitle || 'Oei!'; text = err.gameMessage; }
        else text = escapeHtml(type + ': ' + msg);
    }
    return { line: line, title: title, text: text, type: type };
  }

  /** Waarschuwingen vóór het uitvoeren: bv. functienaam zonder haakjes. */
  function lintWarnings(code, functionNames) {
    const warnings = [];
    code.split('\n').forEach((l, i) => {
      const t = l.trim();
      if (functionNames.includes(t)) {
        warnings.push({ line: i + 1, text: 'Vergeet de haakjes niet: schrijf <code>' + t + '()</code> om het commando uit te voeren.' });
      }
      if (/^\s*\t/.test(l) && /^ /m.test(code)) {
        warnings.push({ line: i + 1, text: 'Je mengt Tabs en spaties. Gebruik liefst overal 4 spaties.' });
      }
    });
    return warnings;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  window.friendlyError = friendlyError;
  window.lintWarnings = lintWarnings;
  window.escapeHtml = escapeHtml;
})();
