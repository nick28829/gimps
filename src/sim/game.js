import { SIM_STEP, START_MONEY, START_TIME, SELL_REFUND } from '../config.js';
import { CATALOG } from '../world/catalog.js';
import { Lot } from '../world/lot.js';
import { buildStarterLot, START_TILE } from '../world/starterLot.js';
import { Gimp } from './gimp.js';
import { dayOf } from './clock.js';

export const SAVE_VERSION = 1;

export class Game {
  constructor({ lot, gimps, money = START_MONEY, time = START_TIME, rng = Math.random }) {
    this.lot = lot;
    this.gimps = gimps;
    this.money = money;
    this.time = time;
    this.rng = rng;
    this.selectedId = gimps[0]?.id ?? null;
    this.notifications = [];
    this.listeners = new Map();
  }

  static newGame({ name, look }, opts = {}) {
    const gimp = new Gimp({ id: 1, name, look, ...START_TILE });
    return new Game({ lot: buildStarterLot(), gimps: [gimp], ...opts });
  }

  get selected() {
    return this.gimps.find((g) => g.id === this.selectedId) ?? null;
  }

  // ---- events ---------------------------------------------------------------

  on(evt, fn) {
    if (!this.listeners.has(evt)) this.listeners.set(evt, []);
    this.listeners.get(evt).push(fn);
  }

  emit(evt, data) {
    for (const fn of this.listeners.get(evt) ?? []) fn(data);
  }

  notify(text, kind = 'info') {
    this.notifications.push({ text, kind });
  }

  drainNotifications() {
    const n = this.notifications;
    this.notifications = [];
    return n;
  }

  // ---- simulation -------------------------------------------------------------

  tick(minutes) {
    while (minutes > 1e-9) {
      const dt = Math.min(SIM_STEP, minutes);
      this.step(dt);
      minutes -= dt;
    }
  }

  step(dt) {
    const day = dayOf(this.time);
    this.time += dt;
    for (const g of this.gimps) g.update(dt, this);
    if (dayOf(this.time) !== day) this.emit('newDay', dayOf(this.time));
  }

  earn(amount) {
    this.money += amount;
  }

  // ---- commands -------------------------------------------------------------

  queueInteraction(gimp, objUid, interactionId) {
    const obj = this.lot.get(objUid);
    if (!obj) return false;
    const def = CATALOG[obj.type].interactions.find((i) => i.id === interactionId);
    if (!def) return false;
    return gimp.enqueue(gimp.makeInteractAction(obj, def, false), this);
  }

  queueWalk(gimp, x, y) {
    if (!this.lot.walkable(x, y)) return false;
    return gimp.enqueue(gimp.makeWalkAction(x, y), this);
  }

  gimpTiles() {
    return this.gimps.map((g) => g.tile);
  }

  canPlace(type, x, y) {
    return this.lot.canPlace(type, x, y, this.gimpTiles());
  }

  buy(type, x, y) {
    const def = CATALOG[type];
    if (!def) return { ok: false, reason: 'Unknown item' };
    if (this.money < def.price) return { ok: false, reason: `Not enough Gimpcoins (needs 🪙${def.price})` };
    const check = this.canPlace(type, x, y);
    if (!check.ok) return check;
    this.money -= def.price;
    const obj = this.lot.place(type, x, y);
    if (def.price >= 250) for (const g of this.gimps) g.addMoodlet('new_stuff', this);
    return { ok: true, obj };
  }

  sell(uid) {
    const obj = this.lot.get(uid);
    if (!obj) return { ok: false, reason: 'Nothing to sell' };
    for (const g of this.gimps) g.forgetObject(uid, this);
    this.lot.remove(uid);
    const refund = Math.floor(CATALOG[obj.type].price * SELL_REFUND);
    this.money += refund;
    return { ok: true, refund };
  }

  // ---- saving -------------------------------------------------------------

  serialize() {
    return {
      version: SAVE_VERSION,
      time: this.time,
      money: this.money,
      selectedId: this.selectedId,
      lot: this.lot.serialize(),
      gimps: this.gimps.map((g) => g.serialize()),
    };
  }

  static deserialize(data, opts = {}) {
    if (data?.version !== SAVE_VERSION) throw new Error(`Unsupported save version ${data?.version}`);
    const game = new Game({
      lot: Lot.deserialize(data.lot),
      gimps: data.gimps.map((g) => Gimp.deserialize(g)),
      money: data.money,
      time: data.time,
      ...opts,
    });
    if (data.selectedId != null) game.selectedId = data.selectedId;
    return game;
  }
}
