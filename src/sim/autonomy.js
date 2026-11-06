import { CATALOG } from '../world/catalog.js';

/** How much a Gimp cares about refilling a need at value v (0..100). Ignores needs above 75. */
export function urgency(v) {
  const t = Math.max(0, 75 - v) / 75;
  return t * t * 3;
}

/** Below this score a Gimp would rather daydream than bother. */
export const MIN_SCORE = 8;

export function scoreInteraction(gimp, game, def) {
  let score = 0;
  for (const [need, amount] of Object.entries(def.ad ?? {})) score += amount * urgency(gimp.needs[need]);
  if (def.adBonus) score += def.adBonus(gimp, game);
  return score;
}

/**
 * Pick something for a Gimp to do on its own.
 * @returns {{obj, def, score}} or null
 */
export function chooseAutonomous(gimp, game) {
  const here = gimp.tile;
  const candidates = [];
  for (const obj of game.lot.all()) {
    if (gimp.avoid.get(obj.uid) > game.time) continue;
    if (obj.inUseBy && obj.inUseBy !== gimp.id) continue;
    for (const def of CATALOG[obj.type].interactions) {
      if (def.autonomous === false) continue;
      if (def.cost && game.money < def.cost) continue;
      let score = scoreInteraction(gimp, game, def);
      if (score < MIN_SCORE) continue;
      const dist = Math.hypot(obj.x + obj.w / 2 - here.x, obj.y + obj.h / 2 - here.y);
      score /= 1 + dist / 40;
      candidates.push({ obj, def, score });
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  const top = candidates.slice(0, 3).filter((c) => c.score >= candidates[0].score * 0.6);
  const total = top.reduce((s, c) => s + c.score, 0);
  let r = game.rng() * total;
  for (const c of top) {
    r -= c.score;
    if (r <= 0) return c;
  }
  return top[0];
}
