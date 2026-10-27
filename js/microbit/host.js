/*
 * MBHost: de "hardware" achter de virtuele micro:bit.
 * Twee standen:
 *  - live: echte tijd, knoppen en sensoren via het scherm, leds worden getekend.
 *  - test: virtuele tijd (geen wachten), knoppen/schudden volgens een scenario,
 *          alles wordt in een logboek bijgehouden om de opdracht te controleren.
 */
(function () {
  'use strict';

  const blank = () => new Array(25).fill(0);

  const MBHost = {
    runner: null,
    mode: 'live',
    onDisplay: null,
    onOutput: null,

    reset(mode, opts) {
      opts = opts || {};
      this.mode = mode;
      this.px = blank();
      this.t0 = performance.now();
      this.vt = 0;
      this.duration = opts.duration || 10000;
      this.events = (opts.events || []).slice().sort((a, b) => a.t - b.t);
      this.evIdx = 0;
      this.log = [{ t: 0, type: 'frame', px: blank(), kind: 'start' }];
      this.buttons = { a: { down: false, presses: 0, was: false }, b: { down: false, presses: 0, was: false } };
      this.accelV = [0, 0, -1024];
      this.gesture = 'face up';
      this.gestureUntil = 0;
      this.gestureAfter = 'face up';
      this.history = [];
      this.touch = { logo: false, 0: false, 1: false, 2: false };
      this.temp = opts.temperature !== undefined ? opts.temperature : (this.liveTemp || 21);
      this.lightLevel = this.liveLight !== undefined ? this.liveLight : 120;
      this.notices = {};
      this.calls = 0;
      if (mode === 'live' && this.onDisplay) this.onDisplay(this.px);
    },

    now() { return this.mode === 'test' ? this.vt : Math.round(performance.now() - this.t0); },

    // ---------- tijd in testmodus ----------
    _applyEvents() {
      while (this.evIdx < this.events.length && this.events[this.evIdx].t <= this.vt) {
        const e = this.events[this.evIdx++];
        if (e.type === 'btn') this.press(e.id, e.down);
        else if (e.type === 'shake') this.shake();
        else if (e.type === 'tilt') this.tilt(e.x, e.y, e.z, e.gesture);
        else if (e.type === 'temp') this.temp = e.value;
        else if (e.type === 'touch') this.touch[e.id] = e.down;
      }
      if (this.gestureUntil && this.now() >= this.gestureUntil) {
        this.gesture = this.gestureAfter;
        this.gestureUntil = 0;
        if (this.mode === 'test' || true) this.accelV = this._accelFor(this.gesture);
      }
    },

    advance(ms) {
      if (this.mode !== 'test') { this._applyEvents(); return; }
      this.vt += ms;
      this._applyEvents();
      if (this.vt > this.duration) {
        this.runner.stop('testdone');
        throw this.runner.stopSignal;
      }
    },

    tick() {
      this.calls++;
      if (this.mode === 'test') this.advance(1);
      else this._applyEvents();
    },

    // ---------- invoer ----------
    press(id, down) {
      const b = this.buttons[id];
      if (!b) return;
      if (down && !b.down) { b.presses++; b.was = true; }
      b.down = down;
    },

    shake() {
      if (this.gesture !== 'shake') this.gestureAfter = this.gesture;
      this.gesture = 'shake';
      this.history.push('shake');
      this.gestureUntil = this.now() + 400;
      this.accelV = [Math.round(Math.random() * 2000 - 1000), Math.round(Math.random() * 2000 - 1000), -1024];
    },

    _accelFor(g) {
      switch (g) {
        case 'left': return [-700, 0, -700];
        case 'right': return [700, 0, -700];
        case 'up': return [0, -700, -700];
        case 'down': return [0, 700, -700];
        case 'face down': return [0, 0, 1024];
        default: return [0, 0, -1024];
      }
    },

    tilt(x, y, z, gesture) {
      this.accelV = [x, y, z];
      if (gesture && gesture !== this.gesture) {
        this.history.push(gesture);
      }
      this.gesture = gesture || 'face up';
      this.gestureAfter = this.gesture;
      this.gestureUntil = 0;
    },

    // ---------- scherm ----------
    setDisplay(px, kind) {
      this.px = px.slice(0, 25);
      while (this.px.length < 25) this.px.push(0);
      if (this.mode === 'test') this.log.push({ t: this.vt, type: 'frame', px: this.px.slice(), kind: kind || '' });
      else if (this.onDisplay) this.onDisplay(this.px);
    },

    sleepMs(ms) {
      ms = Math.max(0, Number(ms) || 0);
      if (this.mode === 'test') { this.advance(ms); return undefined; }
      return this.runner.wait(ms);
    },

    scrollText(text, delay, loop, mono) {
      const cols = MBFont.textColumns(text, mono);
      const empty = [0, 0, 0, 0, 0];
      const padded = [empty, empty, empty, empty, empty].concat(cols, [empty, empty, empty, empty]);
      const frames = [];
      for (let i = 0; i + 5 <= padded.length; i++) {
        const px = [];
        for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) px.push(padded[i + x][y]);
        frames.push(px);
      }
      delay = Math.max(1, Number(delay) || 150);
      if (this.mode === 'test') {
        this.log.push({ t: this.vt, type: 'scroll', text: text });
        do {
          for (const f of frames) { this.setDisplay(f, 'scroll'); this.advance(delay); }
        } while (loop);
        return undefined;
      }
      const self = this;
      return (async function () {
        do {
          for (const f of frames) { self.setDisplay(f, 'scroll'); await self.runner.wait(delay); }
        } while (loop);
      })();
    },

    notice(what) {
      if (this.notices[what]) return;
      this.notices[what] = true;
      if (what === 'music' && this.mode === 'live' && this.onOutput) this.onOutput('♪ (Muziek hoor je alleen op een echte micro:bit V2 of met een luidspreker.)\n');
    },

    // ---------- Python-module _mbhost ----------
    makeModule() {
      const self = this;
      const mod = { __name__: new Sk.builtin.str('_mbhost') };
      function def(name, fn) {
        mod[name] = new Sk.builtin.func(function () {
          const args = Array.prototype.slice.call(arguments).map(a => Sk.ffi.remapToJs(a));
          const res = fn.apply(null, args);
          if (res && typeof res.then === 'function') return self.runner.suspend(res);
          if (res === undefined || res === null) return Sk.builtin.none.none$;
          return Sk.ffi.remapToPy(res);
        });
      }
      def('tick', () => { self.tick(); });
      def('glyph', ch => MBFont.glyph(ch));
      def('show_px', (px, kind) => { self.tick(); self.setDisplay(px, kind); });
      def('log_show', text => { if (self.mode === 'test') self.log.push({ t: self.vt, type: 'show', text: String(text) }); });
      def('sleep', ms => { self.tick(); return self.sleepMs(ms); });
      def('scroll', (text, delay, loop, mono) => { self.tick(); return self.scrollText(text, delay, loop, mono); });
      def('set_pixel', (x, y, v) => {
        self.tick();
        const px = self.px.slice();
        px[y * 5 + x] = v;
        if (self.mode === 'test') self.log.push({ t: self.vt, type: 'set_pixel', x: x, y: y, v: v });
        self.setDisplay(px, 'pixel');
      });
      def('get_pixel', (x, y) => { self.tick(); return self.px[y * 5 + x]; });
      def('btn_is', id => { self.tick(); return self.buttons[id].down; });
      def('btn_was', id => { self.tick(); const b = self.buttons[id]; const w = b.was; b.was = false; return w; });
      def('btn_presses', id => { self.tick(); const b = self.buttons[id]; const n = b.presses; b.presses = 0; b.was = false; return n; });
      def('accel', i => { self.tick(); return self.accelV[i]; });
      def('gesture_current', () => { self.tick(); return self.gesture; });
      def('gesture_was', name => {
        self.tick();
        const found = self.history.includes(name);
        self.history = [];
        return found;
      });
      def('gestures', () => { self.tick(); const h = self.history; self.history = []; return h; });
      def('running_time', () => { self.tick(); return self.now(); });
      def('temperature', () => { self.tick(); return Math.round(self.temp); });
      def('light', () => { self.tick(); return self.lightLevel; });
      def('touched', id => { self.tick(); return !!self.touch[id]; });
      def('notice', what => { self.notice(what); });
      return mod;
    },
  };

  window.MBHost = MBHost;
})();
