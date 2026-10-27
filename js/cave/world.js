/*
 * De grotwereld: kaart, held, kristallen, en het tekenen op een canvas.
 * Alle figuren zijn met eenvoudige vormen getekend (eigen ontwerp).
 */
(function () {
  'use strict';

  const DIRS = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] };

  class CaveWorld {
    constructor(rows) {
      this.rows = rows.slice();
      this.h = rows.length;
      this.w = Math.max(...rows.map(r => r.length));
      this.grid = [];
      this.crystals = new Set();
      for (let y = 0; y < this.h; y++) {
        const line = [];
        for (let x = 0; x < this.w; x++) {
          let c = rows[y][x] || ' ';
          if (c === 'H') { this.start = { x, y }; c = '.'; }
          if (c === '*') { this.crystals.add(x + ',' + y); c = '.'; }
          line.push(c);
        }
        this.grid.push(line);
      }
      this.totalCrystals = this.crystals.size;
      this.reset();
    }

    reset() {
      this.hero = { x: this.start.x, y: this.start.y, face: 1 };
      this.left = new Set(this.crystals);
      this.collected = 0;
      this.status = 'playing';
      this.steps = 0;
    }

    cell(x, y) {
      if (y < 0 || y >= this.h || x < 0 || x >= this.w) return '#';
      const c = this.grid[y][x];
      return c === ' ' ? '#' : c;
    }

    isWall(x, y) { return this.cell(x, y) === '#'; }
    isHole(x, y) { return this.cell(x, y) === 'O'; }
    atExit() { return this.cell(this.hero.x, this.hero.y) === 'E'; }

    look(dir, what) {
      const d = DIRS[dir];
      const x = this.hero.x + d[0], y = this.hero.y + d[1];
      return what === 'wall' ? this.isWall(x, y) : this.isHole(x, y);
    }

    /** Probeer één stap; geeft {ok, kind:'move'|'bump'|'fall', to} */
    tryStep(dir) {
      const d = DIRS[dir];
      const to = { x: this.hero.x + d[0], y: this.hero.y + d[1] };
      if (d[0]) this.hero.face = d[0];
      if (this.isWall(to.x, to.y)) return { ok: false, kind: 'bump', to };
      if (this.isHole(to.x, to.y)) return { ok: false, kind: 'fall', to };
      return { ok: true, kind: 'move', to };
    }

    tryJump(dir) {
      const d = DIRS[dir];
      const over = { x: this.hero.x + d[0], y: this.hero.y + d[1] };
      const to = { x: this.hero.x + 2 * d[0], y: this.hero.y + 2 * d[1] };
      if (d[0]) this.hero.face = d[0];
      if (this.isWall(over.x, over.y)) return { ok: false, kind: 'bump', to: over, wallOver: true };
      if (this.isWall(to.x, to.y)) return { ok: false, kind: 'bumpjump', to };
      if (this.isHole(to.x, to.y)) return { ok: false, kind: 'falljump', to };
      return { ok: true, kind: 'jump', to };
    }

    moveHero(to) {
      this.hero.x = to.x; this.hero.y = to.y;
      this.steps++;
      const k = to.x + ',' + to.y;
      if (this.left.has(k)) {
        this.left.delete(k);
        this.collected++;
        return true;
      }
      return false;
    }
  }

  // ---------- Tekenen ----------

  function hash(x, y, s) {
    let h = (x * 374761393 + y * 668265263 + (s || 0) * 982451653) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  class CaveRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.world = null;
      this.anim = null;      // {type, from, to, start, dur}
      this.effects = [];     // sparkles
      this.bubble = null;    // {text, until}
      this.tile = 48;
      this._loop = this._loop.bind(this);
      requestAnimationFrame(this._loop);
    }

    setWorld(world) {
      this.world = world;
      this.anim = null;
      this.effects = [];
      this.bubble = null;
      this.resize();
    }

    resize() {
      if (!this.world) return;
      const wrap = this.canvas.parentElement;
      const availW = Math.max(200, wrap.clientWidth - 8);
      const availH = Math.max(200, (window.innerHeight || 700) * 0.55);
      this.tile = Math.max(20, Math.min(64, Math.floor(availW / this.world.w), Math.floor(availH / this.world.h)));
      const dpr = window.devicePixelRatio || 1;
      const w = this.tile * this.world.w, h = this.tile * this.world.h;
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /** Start een animatie van de held; de duur wordt elders afgewacht. */
    animate(type, from, to, dur) {
      this.anim = { type, from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y }, start: performance.now(), dur: Math.max(1, dur) };
    }

    endAnim() { this.anim = null; }

    sparkle(x, y) {
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2, v = 0.6 + Math.random() * 1.4;
        this.effects.push({ x: x + 0.5, y: y + 0.5, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.5, born: performance.now(), life: 600 + Math.random() * 400, hue: 170 + Math.random() * 120 });
      }
    }

    say(text, ms) { this.bubble = { text: String(text), until: performance.now() + ms }; }

    _loop(now) {
      requestAnimationFrame(this._loop);
      if (this.world) this.draw(now);
    }

    draw(now) {
      const ctx = this.ctx, w = this.world, t = this.tile;
      ctx.clearRect(0, 0, w.w * t, w.h * t);
      ctx.fillStyle = '#141020';
      ctx.fillRect(0, 0, w.w * t, w.h * t);
      for (let y = 0; y < w.h; y++) {
        for (let x = 0; x < w.w; x++) {
          const c = w.grid[y][x];
          if (c === ' ') continue;
          if (c === '#') this.drawWall(x, y, w);
          else this.drawFloor(x, y);
          if (c === 'O') this.drawHole(x, y);
          if (c === 'E') this.drawExit(x, y, now);
        }
      }
      for (const k of w.left) {
        const [x, y] = k.split(',').map(Number);
        this.drawCrystal(x, y, now);
      }
      this.drawHeroAnimated(now);
      this.drawEffects(now);
      this.drawBubble(now);
    }

    drawFloor(x, y) {
      const ctx = this.ctx, t = this.tile, px = x * t, py = y * t;
      const shade = 58 + Math.floor(hash(x, y) * 10);
      ctx.fillStyle = 'rgb(' + (shade + 22) + ',' + (shade + 8) + ',' + (shade - 6) + ')';
      ctx.fillRect(px, py, t, t);
      ctx.fillStyle = 'rgba(0,0,0,0.13)';
      for (let i = 0; i < 4; i++) {
        const sx = hash(x, y, i + 1) * t, sy = hash(x, y, i + 7) * t, r = 1 + hash(x, y, i + 3) * t * 0.06;
        ctx.beginPath(); ctx.arc(px + sx, py + sy, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, t - 1, t - 1);
    }

    drawWall(x, y, w) {
      const ctx = this.ctx, t = this.tile, px = x * t, py = y * t;
      // Muren naast iets begaanbaars krijgen een 3D-rand, diepe muren zijn donkerder
      const nearOpen = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(d => {
        const c = (w.grid[y + d[1]] || [])[x + d[0]];
        return c && c !== '#' && c !== ' ';
      });
      if (!nearOpen) {
        ctx.fillStyle = '#1e1830';
        ctx.fillRect(px, py, t, t);
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        if (hash(x, y) > 0.6) { ctx.beginPath(); ctx.arc(px + t * hash(x, y, 2), py + t * hash(x, y, 3), t * 0.12, 0, 7); ctx.fill(); }
        return;
      }
      const g = ctx.createLinearGradient(px, py, px, py + t);
      g.addColorStop(0, '#6d6390');
      g.addColorStop(1, '#3b3456');
      ctx.fillStyle = g;
      const r = t * 0.18;
      roundRect(ctx, px + 1, py + 1, t - 2, t - 2, r);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      roundRect(ctx, px + 3, py + 3, t - 6, t * 0.22, r * 0.6);
      ctx.fill();
      ctx.fillStyle = 'rgba(20,14,40,0.35)';
      for (let i = 0; i < 3; i++) {
        const sx = px + t * (0.2 + hash(x, y, i + 11) * 0.6), sy = py + t * (0.4 + hash(x, y, i + 21) * 0.45);
        ctx.beginPath(); ctx.ellipse(sx, sy, t * (0.05 + hash(x, y, i + 31) * 0.06), t * 0.035, 0, 0, Math.PI * 2); ctx.fill();
      }
    }

    drawHole(x, y) {
      const ctx = this.ctx, t = this.tile;
      const cx = x * t + t / 2, cy = y * t + t / 2;
      const g = ctx.createRadialGradient(cx, cy, t * 0.05, cx, cy, t * 0.46);
      g.addColorStop(0, '#000');
      g.addColorStop(0.7, '#0b0712');
      g.addColorStop(1, 'rgba(10,6,16,0.6)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, cy, t * 0.44, t * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,200,120,0.15)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    drawExit(x, y, now) {
      const ctx = this.ctx, t = this.tile, px = x * t, py = y * t;
      const pulse = 0.5 + 0.5 * Math.sin(now / 400);
      ctx.fillStyle = 'rgba(80,255,150,' + (0.15 + pulse * 0.15) + ')';
      ctx.beginPath(); ctx.arc(px + t / 2, py + t / 2, t * 0.5, 0, Math.PI * 2); ctx.fill();
      // deurboog
      ctx.fillStyle = '#7a4b25';
      ctx.beginPath();
      ctx.moveTo(px + t * 0.18, py + t * 0.92);
      ctx.lineTo(px + t * 0.18, py + t * 0.42);
      ctx.arc(px + t / 2, py + t * 0.42, t * 0.32, Math.PI, 0);
      ctx.lineTo(px + t * 0.82, py + t * 0.92);
      ctx.closePath();
      ctx.fill();
      const g = ctx.createLinearGradient(px, py + t * 0.2, px, py + t);
      g.addColorStop(0, '#b8ffcf');
      g.addColorStop(1, '#2fd47a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(px + t * 0.27, py + t * 0.92);
      ctx.lineTo(px + t * 0.27, py + t * 0.45);
      ctx.arc(px + t / 2, py + t * 0.45, t * 0.23, Math.PI, 0);
      ctx.lineTo(px + t * 0.73, py + t * 0.92);
      ctx.closePath();
      ctx.fill();
    }

    drawCrystal(x, y, now) {
      const ctx = this.ctx, t = this.tile;
      const cx = x * t + t / 2, cy = y * t + t / 2 + Math.sin(now / 300 + x + y) * t * 0.04;
      const glow = 0.25 + 0.15 * Math.sin(now / 250 + x * 2);
      const rg = ctx.createRadialGradient(cx, cy, 1, cx, cy, t * 0.45);
      rg.addColorStop(0, 'rgba(120,240,255,' + glow + ')');
      rg.addColorStop(1, 'rgba(120,240,255,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(x * t, y * t, t, t);
      const s = t * 0.28;
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 1.2);
      ctx.lineTo(cx + s * 0.75, cy - s * 0.2);
      ctx.lineTo(cx, cy + s);
      ctx.lineTo(cx - s * 0.75, cy - s * 0.2);
      ctx.closePath();
      const g = ctx.createLinearGradient(cx - s, cy - s, cx + s, cy + s);
      g.addColorStop(0, '#d9fbff');
      g.addColorStop(0.5, '#5ad7ff');
      g.addColorStop(1, '#8a5bff');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.75, cy - s * 0.2); ctx.lineTo(cx + s * 0.75, cy - s * 0.2);
      ctx.moveTo(cx, cy - s * 1.2); ctx.lineTo(cx, cy + s);
      ctx.stroke();
    }

    drawHeroAnimated(now) {
      const w = this.world, a = this.anim;
      let x = w.hero.x, y = w.hero.y, lift = 0, scale = 1, alpha = 1, shake = 0;
      if (a) {
        const p = Math.min(1, (now - a.start) / a.dur);
        const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        if (a.type === 'move' || a.type === 'jump') {
          x = a.from.x + (a.to.x - a.from.x) * e;
          y = a.from.y + (a.to.y - a.from.y) * e;
          lift = a.type === 'jump' ? Math.sin(p * Math.PI) * 0.7 : Math.abs(Math.sin(p * Math.PI * 2)) * 0.06;
        } else if (a.type === 'bump') {
          const k = p < 0.4 ? p / 0.4 : Math.max(0, 1 - (p - 0.4) / 0.3);
          x = a.from.x + (a.to.x - a.from.x) * 0.3 * k;
          y = a.from.y + (a.to.y - a.from.y) * 0.3 * k;
          if (p > 0.4) shake = Math.sin(p * 60) * 0.04 * (1 - p);
        } else if (a.type === 'fall') {
          const mp = Math.min(1, p / 0.45);
          x = a.from.x + (a.to.x - a.from.x) * mp;
          y = a.from.y + (a.to.y - a.from.y) * mp;
          if (a.jumped) lift = Math.sin(mp * Math.PI) * 0.7;
          if (p > 0.45) { const fp = (p - 0.45) / 0.55; scale = 1 - fp * 0.9; alpha = 1 - fp; }
        } else if (a.type === 'win') {
          lift = Math.abs(Math.sin(p * Math.PI * 3)) * 0.35;
        }
      }
      if (w.status === 'dead' && !a) return;
      this.drawHero(x + shake, y, lift, scale, alpha, w.hero.face);
    }

    drawHero(x, y, lift, scale, alpha, face) {
      const ctx = this.ctx, t = this.tile;
      const cx = x * t + t / 2, base = y * t + t * 0.9 - lift * t;
      ctx.save();
      ctx.globalAlpha = alpha;
      // schaduw
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(cx, y * t + t * 0.9, t * 0.22 * scale, t * 0.07 * scale, 0, 0, Math.PI * 2); ctx.fill();
      ctx.translate(cx, base);
      ctx.scale(scale * face, scale);
      const u = t / 48;
      // rugzak
      ctx.fillStyle = '#c0571f';
      roundRect(ctx, -15 * u, -27 * u, 9 * u, 15 * u, 3 * u); ctx.fill();
      // lichaam
      ctx.fillStyle = '#2f8f6b';
      roundRect(ctx, -10 * u, -28 * u, 20 * u, 20 * u, 6 * u); ctx.fill();
      // benen
      ctx.fillStyle = '#3d2a5a';
      roundRect(ctx, -8 * u, -10 * u, 6 * u, 10 * u, 2 * u); ctx.fill();
      roundRect(ctx, 2 * u, -10 * u, 6 * u, 10 * u, 2 * u); ctx.fill();
      // hoofd
      ctx.fillStyle = '#f2c79b';
      ctx.beginPath(); ctx.arc(0, -36 * u, 10 * u, 0, Math.PI * 2); ctx.fill();
      // oog
      ctx.fillStyle = '#20152e';
      ctx.beginPath(); ctx.arc(5 * u, -36 * u, 1.8 * u, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-1 * u, -36 * u, 1.8 * u, 0, Math.PI * 2); ctx.fill();
      // glimlach
      ctx.strokeStyle = '#20152e'; ctx.lineWidth = 1.3 * u;
      ctx.beginPath(); ctx.arc(2 * u, -33 * u, 3.5 * u, 0.2, Math.PI - 0.6); ctx.stroke();
      // helm
      ctx.fillStyle = '#f5c518';
      ctx.beginPath(); ctx.arc(0, -39 * u, 11 * u, Math.PI, 0); ctx.fill();
      ctx.fillRect(-12 * u, -40 * u, 24 * u, 3 * u);
      // lamp
      ctx.fillStyle = '#fff6c2';
      ctx.beginPath(); ctx.arc(7 * u, -45 * u, 3 * u, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,246,170,0.25)';
      ctx.beginPath(); ctx.moveTo(9 * u, -46 * u); ctx.lineTo(30 * u, -54 * u); ctx.lineTo(30 * u, -36 * u); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    drawEffects(now) {
      const ctx = this.ctx, t = this.tile;
      this.effects = this.effects.filter(e => now - e.born < e.life);
      for (const e of this.effects) {
        const p = (now - e.born) / e.life;
        const x = (e.x + e.vx * p * 0.8) * t, y = (e.y + e.vy * p * 0.8 + p * p * 0.5) * t;
        ctx.fillStyle = 'hsla(' + e.hue + ',90%,70%,' + (1 - p) + ')';
        const s = t * 0.07 * (1 - p * 0.5);
        ctx.beginPath();
        ctx.moveTo(x, y - s * 2); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s * 2); ctx.lineTo(x - s, y);
        ctx.fill();
      }
    }

    drawBubble(now) {
      if (!this.bubble || now > this.bubble.until) return;
      const ctx = this.ctx, t = this.tile, w = this.world;
      const fs = Math.max(12, Math.round(t * 0.3));
      ctx.font = 'bold ' + fs + 'px system-ui, sans-serif';
      const text = this.bubble.text.slice(0, 40);
      const tw = ctx.measureText(text).width + fs;
      let bx = w.hero.x * t + t / 2 - tw / 2;
      bx = Math.max(2, Math.min(bx, w.w * t - tw - 2));
      let by = w.hero.y * t - fs * 1.6;
      if (by < 2) by = (w.hero.y + 1) * t + 4;
      ctx.fillStyle = '#fff';
      roundRect(ctx, bx, by, tw, fs * 1.6, fs * 0.5); ctx.fill();
      ctx.fillStyle = '#20152e';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, bx + fs / 2, by + fs * 0.8);
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  window.CaveWorld = CaveWorld;
  window.CaveRenderer = CaveRenderer;
})();
