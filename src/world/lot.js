import { CATALOG } from './catalog.js';

// Floor codes in the tile map:
//   .  grass     p  garden path   #  wall      D  doorway
//   w  wood      c  carpet        t  bath tile k  kitchen tile
export const WALL = '#';
export const DOOR = 'D';

const NEIGHBOURS_4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export class Lot {
  constructor(rows) {
    this.h = rows.length;
    this.w = rows[0].length;
    this.rows = rows.map((r) => r.split(''));
    this.objects = new Map();
    this.occ = new Int32Array(this.w * this.h);
    this.nextUid = 1;
    this.version = 0; // bumps whenever objects change
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  floor(x, y) {
    return this.rows[y][x];
  }

  isWall(x, y) {
    return this.floor(x, y) === WALL;
  }

  objectAt(x, y) {
    if (!this.inBounds(x, y)) return null;
    const uid = this.occ[y * this.w + x];
    return uid ? this.objects.get(uid) : null;
  }

  walkable(x, y) {
    return this.inBounds(x, y) && !this.isWall(x, y) && this.occ[y * this.w + x] === 0;
  }

  get(uid) {
    return this.objects.get(uid) ?? null;
  }

  all() {
    return [...this.objects.values()];
  }

  ofType(type) {
    return this.all().filter((o) => o.type === type);
  }

  /** @param blocked tiles that must stay clear (e.g. where Gimps stand) */
  canPlace(type, x, y, blocked = []) {
    const def = CATALOG[type];
    if (!def) return { ok: false, reason: 'Unknown item' };
    for (let dy = 0; dy < def.h; dy++) {
      for (let dx = 0; dx < def.w; dx++) {
        const tx = x + dx;
        const ty = y + dy;
        if (!this.inBounds(tx, ty)) return { ok: false, reason: 'Outside the lot' };
        const f = this.floor(tx, ty);
        if (f === WALL) return { ok: false, reason: 'Blocked by a wall' };
        if (f === DOOR) return { ok: false, reason: 'Keep doorways clear' };
        if (this.occ[ty * this.w + tx]) return { ok: false, reason: 'Something is already there' };
        if (blocked.some((b) => b.x === tx && b.y === ty)) return { ok: false, reason: 'A Gimp is standing there' };
      }
    }
    return { ok: true };
  }

  place(type, x, y, uid) {
    const def = CATALOG[type];
    const id = uid ?? this.nextUid++;
    if (id >= this.nextUid) this.nextUid = id + 1;
    const obj = { uid: id, type, x, y, w: def.w, h: def.h, inUseBy: null };
    for (const t of this.footprint(obj)) this.occ[t.y * this.w + t.x] = id;
    this.objects.set(id, obj);
    this.version++;
    return obj;
  }

  remove(uid) {
    const obj = this.objects.get(uid);
    if (!obj) return null;
    for (const t of this.footprint(obj)) this.occ[t.y * this.w + t.x] = 0;
    this.objects.delete(uid);
    this.version++;
    return obj;
  }

  footprint(obj) {
    const tiles = [];
    for (let dy = 0; dy < obj.h; dy++) for (let dx = 0; dx < obj.w; dx++) tiles.push({ x: obj.x + dx, y: obj.y + dy });
    return tiles;
  }

  /** Walkable tiles orthogonally next to the object, where a Gimp can use it. */
  standTiles(obj) {
    const out = new Map();
    for (const t of this.footprint(obj)) {
      for (const [dx, dy] of NEIGHBOURS_4) {
        const x = t.x + dx;
        const y = t.y + dy;
        if (this.walkable(x, y)) out.set(`${x},${y}`, { x, y });
      }
    }
    return [...out.values()];
  }

  serialize() {
    return {
      rows: this.rows.map((r) => r.join('')),
      nextUid: this.nextUid,
      objects: this.all().map(({ uid, type, x, y }) => ({ uid, type, x, y })),
    };
  }

  static deserialize(data) {
    const lot = new Lot(data.rows);
    for (const o of data.objects) if (CATALOG[o.type]) lot.place(o.type, o.x, o.y, o.uid);
    lot.nextUid = Math.max(lot.nextUid, data.nextUid ?? 1);
    return lot;
  }
}
