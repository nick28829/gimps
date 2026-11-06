import { TILE } from '../config.js';
import { CATALOG } from '../world/catalog.js';
import { darkness } from '../sim/clock.js';

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

const FLOORS = {
  '.': ['#8cc084', '#86ba7e'],
  p: ['#d4c6ab', '#cbbc9f'],
  w: ['#d8a978', '#cf9f6e'],
  c: ['#c9b6df', '#c2aed9'],
  t: ['#e6f0f4', '#d3e3ea'],
  k: ['#f1e4ca', '#e6d7b9'],
  D: ['#b98a5e', '#b98a5e'],
};

const hash = (x, y) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + amt * 255)));
  const r = f(n >> 16);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function emoji(ctx, ch, x, y, size) {
  ctx.font = `${size}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ch, x, y + size * 0.06);
}

/** Draw a Gimp centred at (cx, cy) — feet roughly at cy + 12·scale. */
export function drawGimpFigure(ctx, cx, cy, look, { scale = 1, facing = 1, bob = 0, sleeping = false } = {}) {
  const s = scale;
  ctx.save();
  if (!sleeping) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 12 * s, 11 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // body
    ctx.fillStyle = look.shirt;
    rrect(ctx, cx - 9 * s, cy - 4 * s + bob, 18 * s, 16 * s, 7 * s);
    ctx.fill();
    ctx.fillStyle = shade(look.shirt, -0.12);
    rrect(ctx, cx - 9 * s, cy + 6 * s + bob, 18 * s, 6 * s, 3 * s);
    ctx.fill();
  }
  const hy = cy - 11 * s + bob;
  // head
  ctx.fillStyle = look.skin;
  ctx.beginPath();
  ctx.arc(cx, hy, 9 * s, 0, Math.PI * 2);
  ctx.fill();
  // hair
  ctx.fillStyle = look.hair;
  ctx.beginPath();
  ctx.arc(cx, hy - 1 * s, 9.4 * s, Math.PI * 1.02, Math.PI * 1.98);
  ctx.quadraticCurveTo(cx + facing * 3 * s, hy - 3 * s, cx - 9 * s, hy - 2 * s);
  ctx.fill();
  // face
  ctx.fillStyle = '#2b2b2b';
  ctx.strokeStyle = '#2b2b2b';
  ctx.lineWidth = 1.4 * s;
  const ex = facing * 1.5 * s;
  if (sleeping) {
    for (const dx of [-3.2, 3.2]) {
      ctx.beginPath();
      ctx.arc(cx + dx * s, hy + 1.5 * s, 1.6 * s, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
  } else {
    for (const dx of [-3.2, 3.2]) {
      ctx.beginPath();
      ctx.arc(cx + dx * s + ex, hy + 1 * s, 1.3 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(cx + ex, hy + 4 * s, 2 * s, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
  ctx.restore();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.staticLayer = document.createElement('canvas');
    this.lightLayer = document.createElement('canvas');
    this.staticKey = null;
    this.dpr = 1;
    this.lot = null;
  }

  setLot(lot) {
    this.lot = lot;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = lot.w * TILE;
    const H = lot.h * TILE;
    for (const c of [this.canvas, this.staticLayer, this.lightLayer]) {
      c.width = W * this.dpr;
      c.height = H * this.dpr;
    }
    this.canvas.style.aspectRatio = `${lot.w} / ${lot.h}`;
    this.staticKey = null;
  }

  /** Convert a pointer event to a tile coordinate. */
  tileFromEvent(e) {
    const r = this.canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * this.lot.w);
    const y = Math.floor(((e.clientY - r.top) / r.height) * this.lot.h);
    return this.lot.inBounds(x, y) ? { x, y } : null;
  }

  // ---- static floor & walls ---------------------------------------------------

  drawStatic() {
    const lot = this.lot;
    const ctx = this.staticLayer.getContext('2d');
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (let y = 0; y < lot.h; y++) {
      for (let x = 0; x < lot.w; x++) {
        const f = lot.floor(x, y);
        const px = x * TILE;
        const py = y * TILE;
        if (f === '#') continue;
        const [a, b] = FLOORS[f] ?? FLOORS['.'];
        if (f === 't' || f === 'k') {
          ctx.fillStyle = (x + y) % 2 ? a : b;
          ctx.fillRect(px, py, TILE, TILE);
        } else if (f === 'w' || f === 'D') {
          ctx.fillStyle = a;
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = b;
          const plank = TILE / 4;
          for (let i = 0; i < 4; i++) {
            ctx.fillRect(px, py + i * plank + plank - 1, TILE, 1);
            const seam = ((i + x * 3) % 4) * (TILE / 4) + (hash(x, i) > 0.5 ? 6 : 0);
            ctx.fillRect(px + seam, py + i * plank, 1, plank);
          }
        } else if (f === '.') {
          ctx.fillStyle = a;
          ctx.fillRect(px, py, TILE, TILE);
          for (let i = 0; i < 5; i++) {
            const r = hash(x * 7 + i, y * 13 - i);
            ctx.fillStyle = r > 0.5 ? b : shade(a, 0.05);
            ctx.fillRect(px + hash(x + i, y) * (TILE - 4), py + hash(x, y + i) * (TILE - 6), 2, 5);
          }
        } else {
          ctx.fillStyle = a;
          ctx.fillRect(px, py, TILE, TILE);
          if (f === 'c') {
            ctx.fillStyle = b;
            for (let i = 0; i < 3; i++) ctx.fillRect(px + hash(x, y + i) * TILE, py + hash(x + i, y) * TILE, 2, 2);
          } else if (f === 'p') {
            ctx.fillStyle = b;
            rrect(ctx, px + 3, py + 3, TILE - 6, TILE - 6, 6);
            ctx.fill();
          }
        }
      }
    }
    // walls on top so they can overlap neighbours a little
    for (let y = 0; y < lot.h; y++) {
      for (let x = 0; x < lot.w; x++) {
        if (lot.floor(x, y) !== '#') continue;
        const px = x * TILE;
        const py = y * TILE;
        ctx.fillStyle = '#6b5647';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#8b7463';
        const wallAt = (dx, dy) => lot.inBounds(x + dx, y + dy) && lot.floor(x + dx, y + dy) === '#';
        const l = wallAt(-1, 0) ? 0 : 6;
        const r = wallAt(1, 0) ? 0 : 6;
        const t = wallAt(0, -1) ? 0 : 6;
        const b = wallAt(0, 1) ? 0 : 6;
        ctx.fillRect(px + l, py + t, TILE - l - r, TILE - t - b);
      }
    }
    // door frames
    for (let y = 0; y < lot.h; y++) {
      for (let x = 0; x < lot.w; x++) {
        if (lot.floor(x, y) !== 'D') continue;
        const horizontal = lot.inBounds(x - 1, y) && ['#', 'D'].includes(lot.floor(x - 1, y));
        ctx.fillStyle = '#5a4637';
        if (horizontal) {
          ctx.fillRect(x * TILE, y * TILE + 2, TILE, 3);
          ctx.fillRect(x * TILE, y * TILE + TILE - 5, TILE, 3);
        } else {
          ctx.fillRect(x * TILE + 2, y * TILE, 3, TILE);
          ctx.fillRect(x * TILE + TILE - 5, y * TILE, 3, TILE);
        }
      }
    }
  }

  // ---- objects -------------------------------------------------------------

  drawObject(ctx, o, { ghost = false } = {}) {
    const def = CATALOG[o.type];
    const px = o.x * TILE;
    const py = o.y * TILE;
    const w = o.w * TILE;
    const h = o.h * TILE;
    if (!ghost) {
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      rrect(ctx, px + 5, py + 7, w - 7, h - 7, 7);
      ctx.fill();
    }
    if (def.shape === 'bed') {
      ctx.fillStyle = '#8d6e63';
      rrect(ctx, px + 3, py + 3, w - 6, h - 6, 6);
      ctx.fill();
      ctx.fillStyle = '#fbf7f0';
      rrect(ctx, px + 6, py + 6, w - 12, h - 12, 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      const pillows = o.w;
      for (let i = 0; i < pillows; i++) {
        rrect(ctx, px + 9 + i * ((w - 12) / pillows), py + 9, (w - 12) / pillows - 6, 13, 5);
        ctx.fill();
      }
      ctx.fillStyle = def.color;
      rrect(ctx, px + 6, py + 26, w - 12, h - 32, 4);
      ctx.fill();
      ctx.fillStyle = shade(def.color, -0.1);
      ctx.fillRect(px + 6, py + 26, w - 12, 4);
      return;
    }
    if (def.shape === 'sofa') {
      ctx.fillStyle = shade(def.color, -0.18);
      rrect(ctx, px + 3, py + 4, w - 6, h - 7, 8);
      ctx.fill();
      ctx.fillStyle = def.color;
      const seats = o.w;
      for (let i = 0; i < seats; i++) {
        rrect(ctx, px + 7 + i * ((w - 14) / seats), py + 14, (w - 14) / seats - 3, h - 21, 5);
        ctx.fill();
      }
      return;
    }
    ctx.fillStyle = def.color;
    rrect(ctx, px + 4, py + 4, w - 8, h - 8, 8);
    ctx.fill();
    ctx.strokeStyle = shade(def.color, -0.22);
    ctx.lineWidth = 2;
    ctx.stroke();
    emoji(ctx, def.icon, px + w / 2, py + h / 2, Math.min(w, h) * 0.55);
  }

  // ---- Gimps ----------------------------------------------------------------

  drawGimp(ctx, g, game, selected, t) {
    let cx = g.x * TILE;
    let cy = g.y * TILE - 4;
    let sleeping = false;
    let scale = 1;
    if (g.snap) {
      const def = CATALOG[g.snap.type];
      const obj = game.lot.get(g.snap.uid);
      const lying = def.shape === 'bed' && ['sleep', 'nap'].includes(g.current?.def?.id);
      if (lying && obj) {
        cx = (obj.x + obj.w / 2) * TILE;
        cy = obj.y * TILE + 30;
        sleeping = true;
      } else {
        cx = g.snap.x * TILE;
        cy = g.snap.y * TILE - 2;
        scale = 0.9;
      }
    }
    if (g.current?.def?.id === 'passout') sleeping = true;

    if (selected && !sleeping) {
      ctx.strokeStyle = `rgba(255,255,255,${0.65 + 0.3 * Math.sin(t * 4)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 12 * scale, 14, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const bob = g.walking ? Math.abs(Math.sin(t * 14)) * -2.5 : 0;
    drawGimpFigure(ctx, cx, cy, g.look, { scale, facing: g.facing, bob, sleeping });

    // thought bubble with the current activity
    const a = g.current;
    if (a && a.def?.id !== 'idle') {
      const bx = cx + 14;
      const by = cy - 34;
      ctx.globalAlpha = a.phase === 'doing' ? 1 : 0.7;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(bx, by, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bx - 9, by + 13, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#333';
      emoji(ctx, a.icon, bx, by, 15);
      ctx.globalAlpha = 1;
    }
    if (sleeping) {
      ctx.fillStyle = 'rgba(60,70,120,0.85)';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      for (let i = 0; i < 3; i++) {
        const p = (t * 0.6 + i / 3) % 1;
        ctx.globalAlpha = 1 - p;
        ctx.fillText('z', cx + 8 + p * 12, cy - 18 - p * 22);
      }
      ctx.globalAlpha = 1;
    }
  }

  drawPath(ctx, g) {
    const a = g.current;
    if (!a || a.phase !== 'walking' || !a.path?.length) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(g.x * TILE, g.y * TILE);
    for (const p of a.path) ctx.lineTo((p.x + 0.5) * TILE, (p.y + 0.5) * TILE);
    ctx.stroke();
    ctx.restore();
  }

  // ---- lighting -------------------------------------------------------------

  drawLighting(ctx, game) {
    const dark = darkness(game.time);
    if (dark <= 0) return;
    const lctx = this.lightLayer.getContext('2d');
    lctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    lctx.globalCompositeOperation = 'source-over';
    lctx.clearRect(0, 0, this.lot.w * TILE, this.lot.h * TILE);
    lctx.fillStyle = `rgba(16, 22, 58, ${0.55 * dark})`;
    lctx.fillRect(0, 0, this.lot.w * TILE, this.lot.h * TILE);
    lctx.globalCompositeOperation = 'destination-out';
    for (const o of game.lot.all()) {
      const radius = CATALOG[o.type].light;
      if (!radius) continue;
      const x = (o.x + o.w / 2) * TILE;
      const y = (o.y + o.h / 2) * TILE;
      const grad = lctx.createRadialGradient(x, y, 4, x, y, radius * TILE);
      grad.addColorStop(0, 'rgba(0,0,0,0.95)');
      grad.addColorStop(0.6, 'rgba(0,0,0,0.6)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = grad;
      lctx.fillRect(x - radius * TILE, y - radius * TILE, radius * TILE * 2, radius * TILE * 2);
    }
    lctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.lightLayer, 0, 0, this.lot.w * TILE, this.lot.h * TILE);
    // warm glow
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const o of game.lot.all()) {
      const radius = CATALOG[o.type].light;
      if (!radius) continue;
      const x = (o.x + o.w / 2) * TILE;
      const y = (o.y + o.h / 2) * TILE;
      const grad = ctx.createRadialGradient(x, y, 2, x, y, radius * TILE * 0.8);
      grad.addColorStop(0, `rgba(255,190,90,${0.28 * dark})`);
      grad.addColorStop(1, 'rgba(255,190,90,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x - radius * TILE, y - radius * TILE, radius * TILE * 2, radius * TILE * 2);
    }
    ctx.restore();
  }

  // ---- frame ----------------------------------------------------------------

  /**
   * @param view { mode: 'live'|'buy', hover: {x,y}|null, buyType, sellTool }
   */
  draw(game, view, t) {
    if (this.lot !== game.lot) this.setLot(game.lot);
    if (this.staticKey !== this.lot) {
      this.drawStatic();
      this.staticKey = this.lot;
    }
    const ctx = this.ctx;
    const W = this.lot.w * TILE;
    const H = this.lot.h * TILE;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.drawImage(this.staticLayer, 0, 0, W, H);

    if (view.mode === 'buy') {
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= this.lot.w; x++) {
        ctx.moveTo(x * TILE + 0.5, 0);
        ctx.lineTo(x * TILE + 0.5, H);
      }
      for (let y = 0; y <= this.lot.h; y++) {
        ctx.moveTo(0, y * TILE + 0.5);
        ctx.lineTo(W, y * TILE + 0.5);
      }
      ctx.stroke();
    }

    const objects = game.lot.all().sort((a, b) => a.y + a.h - (b.y + b.h));
    for (const o of objects) this.drawObject(ctx, o);

    const hoverObj = view.hover ? game.lot.objectAt(view.hover.x, view.hover.y) : null;
    if (view.hover) {
      if (view.mode === 'buy' && view.buyType) {
        const def = CATALOG[view.buyType];
        const ok = game.canPlace(view.buyType, view.hover.x, view.hover.y).ok && game.money >= def.price;
        const ghost = { type: view.buyType, x: view.hover.x, y: view.hover.y, w: def.w, h: def.h };
        ctx.globalAlpha = 0.65;
        this.drawObject(ctx, ghost, { ghost: true });
        ctx.globalAlpha = 1;
        ctx.fillStyle = ok ? 'rgba(80,220,140,0.28)' : 'rgba(240,70,70,0.35)';
        ctx.fillRect(ghost.x * TILE, ghost.y * TILE, def.w * TILE, def.h * TILE);
      } else if (hoverObj) {
        const sell = view.mode === 'buy' && view.sellTool;
        ctx.strokeStyle = sell ? '#ff5a5a' : '#ffffff';
        ctx.lineWidth = 3;
        rrect(ctx, hoverObj.x * TILE + 2, hoverObj.y * TILE + 2, hoverObj.w * TILE - 4, hoverObj.h * TILE - 4, 8);
        ctx.stroke();
        if (sell) {
          ctx.fillStyle = 'rgba(255,60,60,0.2)';
          ctx.fill();
        }
      } else if (view.mode === 'live' && game.lot.walkable(view.hover.x, view.hover.y)) {
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 2;
        rrect(ctx, view.hover.x * TILE + 3, view.hover.y * TILE + 3, TILE - 6, TILE - 6, 6);
        ctx.stroke();
      }
    }

    const sel = game.selected;
    if (sel && view.mode === 'live') this.drawPath(ctx, sel);
    for (const g of [...game.gimps].sort((a, b) => a.y - b.y)) this.drawGimp(ctx, g, game, g === sel, t);

    this.drawLighting(ctx, game);
  }
}
