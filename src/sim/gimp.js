import { NEEDS, NEED_INFO, SKILLS, MAX_SKILL, WALK_SPEED, MAX_QUEUE, xpForLevel } from '../config.js';
import { CATALOG } from '../world/catalog.js';
import { findPath } from '../world/pathfinding.js';
import { MOODLETS, moodScore, moodMultiplier } from './mood.js';
import { chooseAutonomous } from './autonomy.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const SPECIAL = {
  passout: {
    id: 'passout',
    label: 'Passed out',
    icon: '😵',
    duration: 240,
    cancelable: false,
    effects: { energy: 12, hunger: -2.5, bladder: -3.5, hygiene: -2, fun: 0, social: 0 },
    onFinish: (g, game) => g.addMoodlet('floor_sleep', game),
  },
  idle: { id: 'idle', label: 'Daydreaming', icon: '💭', duration: 12 },
};

let actionSeq = 1;

export class Gimp {
  constructor({ id, name, look, x, y, needs, skills, moodlets, freeWill = true }) {
    this.id = id;
    this.name = name;
    this.look = look;
    this.x = x + 0.5;
    this.y = y + 0.5;
    this.needs = needs ?? { hunger: 80, energy: 85, bladder: 75, hygiene: 90, fun: 70, social: 65 };
    this.skills = skills ?? Object.fromEntries(Object.keys(SKILLS).map((k) => [k, { level: 0, xp: 0 }]));
    for (const k of Object.keys(SKILLS)) this.skills[k] ??= { level: 0, xp: 0 };
    this.moodlets = moodlets ?? []; // [{id, expires}]
    this.freeWill = freeWill;

    this.queue = [];
    this.current = null;
    this.rest = 0; // minutes to wait before the next autonomous decision
    this.snap = null; // render position while sitting/lying on an object
    this.facing = 1;
    this.walking = false;
    this.avoid = new Map(); // objUid -> game time until which free will ignores it
  }

  get tile() {
    return { x: Math.floor(this.x), y: Math.floor(this.y) };
  }

  // ---- feelings -----------------------------------------------------------

  mood(game) {
    return moodScore(this, game.time);
  }

  moodMultiplier(game) {
    return moodMultiplier(this.mood(game));
  }

  addMoodlet(id, game) {
    const def = MOODLETS[id];
    const expires = game.time + def.hours * 60;
    const existing = this.moodlets.find((m) => m.id === id);
    if (existing) existing.expires = expires;
    else this.moodlets.push({ id, expires });
  }

  decayRate(need) {
    let r = NEED_INFO[need].decay;
    if (need === 'energy') r *= 1 - 0.04 * this.skills.fitness.level;
    return r;
  }

  gainSkill(name, hours, game) {
    const s = this.skills[name];
    if (s.level >= MAX_SKILL) return;
    s.xp += hours;
    const needed = xpForLevel(s.level);
    if (s.xp >= needed) {
      s.xp -= needed;
      s.level++;
      game.notify(`${this.name} reached ${SKILLS[name].label} level ${s.level}! ${SKILLS[name].icon}`, 'good');
    }
  }

  // ---- actions ------------------------------------------------------------

  makeInteractAction(obj, def, autonomous) {
    return {
      uid: actionSeq++,
      kind: 'interact',
      objUid: obj.uid,
      def,
      label: def.label,
      icon: def.icon,
      where: CATALOG[obj.type].name,
      autonomous,
      phase: 'queued',
      elapsed: 0,
    };
  }

  makeSpecialAction(def, autonomous = true) {
    return { uid: actionSeq++, kind: 'special', def, label: def.label, icon: def.icon, autonomous, phase: 'queued', elapsed: 0 };
  }

  makeWalkAction(x, y) {
    return { uid: actionSeq++, kind: 'walk', target: { x, y }, label: 'Go here', icon: '👣', autonomous: false, phase: 'queued', elapsed: 0 };
  }

  /** Add a player command. Interrupts whatever the Gimp is doing on its own. */
  enqueue(action, game) {
    if (this.queue.length >= MAX_QUEUE) {
      game.notify(`${this.name}'s to-do list is full.`, 'warn');
      return false;
    }
    if (this.current?.autonomous && this.current.def?.cancelable !== false) this.endCurrent(game, false);
    this.rest = 0;
    this.queue.push(action);
    return true;
  }

  cancel(actionUid, game) {
    if (this.current?.uid === actionUid) {
      if (this.current.def?.cancelable === false) return false;
      this.endCurrent(game, false);
      this.rest = 1;
      return true;
    }
    const before = this.queue.length;
    this.queue = this.queue.filter((a) => a.uid !== actionUid);
    return this.queue.length !== before;
  }

  /** Remove anything that involves an object (e.g. it was sold). */
  forgetObject(uid, game) {
    this.queue = this.queue.filter((a) => a.objUid !== uid);
    if (this.current && (this.current.objUid === uid || this.current.targetUid === uid)) this.endCurrent(game, false);
  }

  // ---- simulation -----------------------------------------------------------

  update(dt, game) {
    const doing = this.current?.phase === 'doing' ? this.current : null;
    const fx = doing?.def?.effects;
    for (const n of NEEDS) {
      const rate = fx && fx[n] !== undefined ? fx[n] : -this.decayRate(n);
      this.needs[n] = clamp(this.needs[n] + (rate * dt) / 60, 0, 100);
    }
    this.moodlets = this.moodlets.filter((m) => m.expires > game.time);

    this.checkCritical(game, doing);
    if (!this.current) this.pickNext(dt, game);
    if (this.current) this.advance(dt, game);
  }

  checkCritical(game, doing) {
    if (this.needs.bladder <= 0 && doing?.def?.id !== 'use_toilet') {
      this.needs.bladder = 100;
      this.needs.hygiene = Math.max(0, this.needs.hygiene - 50);
      this.addMoodlet('embarrassed', game);
      game.notify(`${this.name} couldn't hold it in... 💦`, 'bad');
      if (this.current && this.current.def?.cancelable !== false) this.endCurrent(game, false);
    }
    const resting = doing?.def?.effects?.energy > 0;
    if (this.needs.energy <= 0 && !resting) {
      if (this.current) this.endCurrent(game, false);
      this.queue = [];
      const a = this.makeSpecialAction(SPECIAL.passout);
      a.phase = 'doing';
      this.current = a;
      game.notify(`${this.name} passed out from exhaustion! 😵`, 'bad');
    }
  }

  pickNext(dt, game) {
    if (this.queue.length) {
      this.begin(this.queue.shift(), game);
      return;
    }
    if (!this.freeWill) return;
    if (this.rest > 0) {
      this.rest -= dt;
      return;
    }
    const choice = chooseAutonomous(this, game);
    if (choice && this.begin(this.makeInteractAction(choice.obj, choice.def, true), game)) return;
    if (!this.current) this.begin(this.makeSpecialAction(SPECIAL.idle), game);
  }

  begin(a, game) {
    this.current = a;
    a.elapsed = 0;
    if (a.kind === 'special') {
      a.phase = 'doing';
      return true;
    }
    if (a.kind === 'walk') {
      const path = findPath(game.lot, this.tile, [a.target]);
      if (!path) return this.fail(a, game, `${this.name} can't get there.`);
      a.goals = [a.target];
      a.path = this.withRecentre(path);
      a.phase = 'walking';
      return true;
    }

    const obj = game.lot.get(a.objUid);
    if (!obj) return this.fail(a, game, null);
    const def = a.def;
    let target = obj;
    if (def.via) target = this.nearestFree(game, def.via) ?? obj;
    a.targetUid = target.uid;
    a.snapTo = def.snap && (!def.via || target !== obj) ? target.uid : null;

    if (target.inUseBy && target.inUseBy !== this.id) return this.fail(a, game, `The ${CATALOG[target.type].name} is busy.`);
    if (def.cost && game.money < def.cost) return this.fail(a, game, `Not enough Gimpcoins to ${def.label.toLowerCase()} (needs 🪙${def.cost}).`);
    const goals = game.lot.standTiles(target);
    const path = goals.length ? findPath(game.lot, this.tile, goals) : null;
    if (!path) return this.fail(a, game, `${this.name} can't reach the ${CATALOG[target.type].name}.`);
    a.goals = goals;
    a.path = this.withRecentre(path);
    a.phase = 'walking';
    return true;
  }

  /** If we stopped between tiles, walk back to our tile's centre first. */
  withRecentre(path) {
    const t = this.tile;
    const off = Math.abs(this.x - (t.x + 0.5)) + Math.abs(this.y - (t.y + 0.5)) > 0.01;
    return off ? [t, ...path] : path;
  }

  nearestFree(game, type) {
    let best = null;
    let bestD = Infinity;
    for (const o of game.lot.ofType(type)) {
      if (o.inUseBy && o.inUseBy !== this.id) continue;
      const d = Math.hypot(o.x - this.x, o.y - this.y);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    return best;
  }

  fail(a, game, msg) {
    if (msg && !a.autonomous) game.notify(msg, 'warn');
    if (a.autonomous) {
      this.rest = 5;
      if (a.objUid) this.avoid.set(a.objUid, game.time + 60);
    }
    this.walking = false;
    if (this.current === a) this.current = null;
    return false;
  }

  advance(dt, game) {
    const a = this.current;
    if (a.phase === 'walking') {
      const arrived = this.walk(dt, game, a);
      if (arrived) this.arrive(a, game);
    } else if (a.phase === 'doing') {
      this.perform(dt, game, a);
    }
  }

  /** @returns true when arrived, false when still walking or failed */
  walk(dt, game, a) {
    if (a.kind === 'interact' && !game.lot.get(a.targetUid)) {
      this.fail(a, game, null);
      return false;
    }
    let budget = WALK_SPEED * dt;
    this.walking = true;
    while (budget > 0 && a.path.length) {
      const next = a.path[0];
      const t = this.tile;
      const isCurrentTile = next.x === t.x && next.y === t.y;
      if (!isCurrentTile && !game.lot.walkable(next.x, next.y)) {
        // Something was placed in the way: find a new route.
        if (a.kind === 'interact') a.goals = game.lot.standTiles(game.lot.get(a.targetUid));
        const p = a.goals.length ? findPath(game.lot, t, a.goals) : null;
        if (!p) {
          this.fail(a, game, `${this.name}'s path is blocked!`);
          return false;
        }
        a.path = this.withRecentre(p);
        continue;
      }
      const tx = next.x + 0.5;
      const ty = next.y + 0.5;
      const dx = tx - this.x;
      const dy = ty - this.y;
      const d = Math.hypot(dx, dy);
      if (Math.abs(dx) > 0.01) this.facing = Math.sign(dx);
      if (d <= budget) {
        this.x = tx;
        this.y = ty;
        budget -= d;
        a.path.shift();
      } else {
        this.x += (dx / d) * budget;
        this.y += (dy / d) * budget;
        budget = 0;
      }
    }
    if (a.path.length) return false;
    this.walking = false;
    return true;
  }

  arrive(a, game) {
    if (a.kind === 'walk') {
      this.current = null;
      return;
    }
    const target = game.lot.get(a.targetUid);
    if (!target) return this.fail(a, game, null);
    if (target.inUseBy && target.inUseBy !== this.id) return this.fail(a, game, `The ${CATALOG[target.type].name} is busy.`);
    if (a.def.cost) {
      if (game.money < a.def.cost) return this.fail(a, game, `Not enough Gimpcoins (needs 🪙${a.def.cost}).`);
      game.money -= a.def.cost;
    }
    target.inUseBy = this.id;
    a.phase = 'doing';
    a.elapsed = 0;
    const cx = target.x + target.w / 2;
    if (Math.abs(cx - this.x) > 0.1) this.facing = Math.sign(cx - this.x);
    if (a.snapTo) this.snap = { x: cx, y: target.y + target.h / 2, uid: target.uid, type: target.type };
  }

  perform(dt, game, a) {
    const def = a.def;
    a.elapsed += dt;
    const mult = def.skill || def.pay ? this.moodMultiplier(game) : 1;
    if (def.skill) this.gainSkill(def.skill.name, ((def.skill.rate * dt) / 60) * mult, game);
    if (def.pay) game.earn(((def.pay(this) * dt) / 60) * mult);
    const full = def.until && this.needs[def.until] >= 99.5 && a.elapsed >= (def.minDuration ?? 0);
    if (a.elapsed >= def.duration || full) this.endCurrent(game, true);
  }

  endCurrent(game, completed) {
    const a = this.current;
    if (!a) return;
    if (a.targetUid) {
      const t = game.lot.get(a.targetUid);
      if (t && t.inUseBy === this.id) t.inUseBy = null;
    }
    this.snap = null;
    this.walking = false;
    this.current = null;
    if (a.autonomous) this.rest = 2 + game.rng() * 4;
    if (completed && a.def?.onFinish) a.def.onFinish(this, game);
  }

  // ---- saving -------------------------------------------------------------

  serialize() {
    const { x, y } = this.tile;
    return {
      id: this.id,
      name: this.name,
      look: this.look,
      x,
      y,
      needs: { ...this.needs },
      skills: structuredClone(this.skills),
      moodlets: this.moodlets.map((m) => ({ ...m })),
      freeWill: this.freeWill,
    };
  }

  static deserialize(d) {
    return new Gimp(d);
  }
}
