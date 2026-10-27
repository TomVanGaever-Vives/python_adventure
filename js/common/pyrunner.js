/*
 * PyRunner: voert Python-code uit met Skulpt.
 * - Commando's die tijd nodig hebben (animatie, sleep) geven een Promise terug;
 *   Skulpt pauzeert het programma tot die Promise klaar is.
 * - stop() onderbreekt het programma meteen.
 * - onLine(n) meldt welke regel van de leerling op dat moment bezig is.
 */
(function () {
  'use strict';

  const USER_FILE = '<stdin>.py';

  /** Speciaal signaal: het programma werd gestopt (Stop-knop of einde van het spel). */
  class StopSignal {
    constructor(reason, info) {
      this.reason = reason || 'stop';
      this.info = info || null;
    }
  }

  class PyRunner {
    constructor(opts) {
      this.onOutput = opts.onOutput || function () {};
      this.onLine = opts.onLine || function () {};
      this.running = false;
      this.stopSignal = null;
      this.pending = new Set();
      this.extraFiles = opts.extraFiles || {};
    }

    /** Wacht ms milliseconden; wordt afgebroken als het programma stopt. */
    wait(ms) {
      return new Promise((resolve, reject) => {
        if (this.stopSignal) { reject(this.stopSignal); return; }
        const entry = { reject: reject };
        entry.timer = setTimeout(() => {
          this.pending.delete(entry);
          resolve();
        }, Math.max(0, ms));
        this.pending.add(entry);
      });
    }

    /** Laat een Promise uitvoeren als een (pauzerende) Python-functie. */
    suspend(promise) {
      return Sk.misceval.promiseToSuspension(promise.then(v => (v === undefined ? Sk.builtin.none.none$ : v)));
    }

    /** Stop het programma. reason kan bv. 'stop', 'gameover', 'testdone' zijn. */
    stop(reason, info) {
      if (!this.running) return;
      if (!this.stopSignal) this.stopSignal = new StopSignal(reason, info);
      for (const entry of this.pending) {
        clearTimeout(entry.timer);
        entry.reject(this.stopSignal);
      }
      this.pending.clear();
    }

    _lineFromSuspension(r) {
      let s = r, line = null;
      while (s) {
        if (s.$filename === USER_FILE && s.$lineno) line = s.$lineno;
        s = s.child;
      }
      return line;
    }

    /**
     * Voer code uit. opts.builtins: {naam: js-functie} worden globale Python-functies.
     * opts.execLimit: max. ms rekentijd zonder pauze (tegen oneindige lussen).
     * Resultaat: {status: 'ok'|'error'|'stopped', error, signal}
     */
    run(code, opts) {
      opts = opts || {};
      if (this.running) this.stop('stop');
      this.running = true;
      this.stopSignal = null;
      const self = this;
      const files = this.extraFiles;

      Sk.configure({
        output: t => self.onOutput(t),
        read: function (name) {
          if (files[name] !== undefined) return typeof files[name] === 'function' ? files[name]() : files[name];
          if (Sk.builtinFiles && Sk.builtinFiles.files[name] !== undefined) return Sk.builtinFiles.files[name];
          throw new Sk.builtin.ImportError("Module niet gevonden: " + name);
        },
        __future__: Sk.python3,
        killableWhile: false,
        killableFor: false,
        yieldLimit: 40,
        execLimit: opts.execLimit || null,
        inputfun: function () { return ''; },
        inputfunTakesPrompt: true,
      });

      // Eigen globale functies (bv. move_right) toevoegen, oude weghalen
      if (this._addedBuiltins) {
        for (const n of this._addedBuiltins) delete Sk.builtins[n];
      }
      this._addedBuiltins = [];
      const builtins = opts.builtins || {};
      for (const name of Object.keys(builtins)) {
        const fn = builtins[name];
        const f = new Sk.builtin.func(function () {
          const args = Array.prototype.slice.call(arguments).map(a => (a === undefined ? undefined : Sk.ffi.remapToJs(a)));
          const res = fn.apply(null, args);
          if (res && typeof res.then === 'function') return self.suspend(res);
          if (res === undefined || res === null) return Sk.builtin.none.none$;
          return Sk.ffi.remapToPy(res);
        });
        f.$name = name;
        Sk.builtins[name] = f;
        this._addedBuiltins.push(name);
      }

      Sk.execStart = Date.now();
      const handlers = {
        '*': function (r) {
          if (self.stopSignal) return Promise.reject(self.stopSignal);
          if (r.data.type === 'Sk.promise') {
            const line = self._lineFromSuspension(r);
            if (line) self.onLine(line);
            return r.data.promise.then(function (v) {
              if (self.stopSignal) throw self.stopSignal;
              r.data.result = v;
              Sk.execStart = Sk.lastYield = Date.now();
              return r.resume();
            });
          }
          if (r.data.type === 'Sk.delay') return Promise.resolve(r.resume());
          if (r.data.type === 'Sk.yield') {
            return new Promise(function (resolve, reject) {
              setTimeout(function () {
                if (self.stopSignal) { reject(self.stopSignal); return; }
                Sk.lastYield = Date.now();
                try { resolve(r.resume()); } catch (e) { reject(e); }
              }, 0);
            });
          }
          return null;
        },
      };

      return Sk.misceval.asyncToPromise(function () {
        return Sk.importMainWithBody('<stdin>', false, code, true);
      }, handlers).then(function () {
        self.running = false;
        if (self.stopSignal) return { status: 'stopped', signal: self.stopSignal };
        return { status: 'ok' };
      }, function (err) {
        self.running = false;
        const unwrapped = PyRunner.unwrap(err);
        if (unwrapped instanceof StopSignal) return { status: 'stopped', signal: unwrapped };
        if (self.stopSignal) return { status: 'stopped', signal: self.stopSignal };
        return { status: 'error', error: unwrapped };
      });
    }

    static unwrap(err) {
      let e = err;
      for (let i = 0; i < 5 && e; i++) {
        if (e instanceof StopSignal) return e;
        if (e.nativeError) { e = e.nativeError; continue; }
        if (e.args && e.args.v && e.args.v[0] instanceof StopSignal) return e.args.v[0];
        break;
      }
      return e;
    }
  }

  /** Telt de regels die echt code zijn (geen lege regels of commentaar). */
  function countCodeLines(code) {
    return code.split('\n').filter(l => {
      const t = l.trim();
      return t.length > 0 && !t.startsWith('#');
    }).length;
  }

  window.PyRunner = PyRunner;
  window.StopSignal = StopSignal;
  window.countCodeLines = countCodeLines;
  window.PY_USER_FILE = USER_FILE;
})();
