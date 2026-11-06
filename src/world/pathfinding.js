// A* on the lot grid. 8 directions, no squeezing diagonally past corners.

const DIRS = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
];

const octile = (ax, ay, bx, by) => {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
};

/**
 * @param lot   object with w, h, walkable(x, y)
 * @param start {x, y} (may itself be unwalkable)
 * @param goals array of {x, y}; reaching any of them is success
 * @returns array of tiles from the step after `start` to the goal, [] if
 *          already there, or null if unreachable.
 */
export function findPath(lot, start, goals) {
  if (!goals.length) return null;
  const { w, h } = lot;
  const idx = (x, y) => y * w + x;
  const goalSet = new Set(goals.map((g) => idx(g.x, g.y)));
  const startI = idx(start.x, start.y);
  if (goalSet.has(startI)) return [];

  const heur = (x, y) => {
    let best = Infinity;
    for (const g of goals) best = Math.min(best, octile(x, y, g.x, g.y));
    return best;
  };

  const gScore = new Float64Array(w * h).fill(Infinity);
  const came = new Int32Array(w * h).fill(-1);
  const closed = new Uint8Array(w * h);
  gScore[startI] = 0;
  // The grids are small, so a plain array as the open list is plenty fast.
  const open = [{ i: startI, x: start.x, y: start.y, f: heur(start.x, start.y) }];

  while (open.length) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (open[k].f < open[bi].f) bi = k;
    const cur = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    if (closed[cur.i]) continue;
    closed[cur.i] = 1;

    if (goalSet.has(cur.i)) {
      const path = [];
      for (let i = cur.i; i !== startI; i = came[i]) path.push({ x: i % w, y: Math.floor(i / w) });
      return path.reverse();
    }

    for (const [dx, dy, cost] of DIRS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!lot.walkable(nx, ny)) continue;
      if (dx && dy && (!lot.walkable(cur.x + dx, cur.y) || !lot.walkable(cur.x, cur.y + dy))) continue;
      const ni = idx(nx, ny);
      if (closed[ni]) continue;
      const g = gScore[cur.i] + cost;
      if (g < gScore[ni]) {
        gScore[ni] = g;
        came[ni] = cur.i;
        open.push({ i: ni, x: nx, y: ny, f: g + heur(nx, ny) });
      }
    }
  }
  return null;
}
