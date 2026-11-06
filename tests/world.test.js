import test from 'node:test';
import assert from 'node:assert/strict';
import { Lot } from '../src/world/lot.js';
import { findPath } from '../src/world/pathfinding.js';
import { buildStarterLot } from '../src/world/starterLot.js';
import { CATALOG } from '../src/world/catalog.js';

const adjacent = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) === 1;

test('findPath routes around walls', () => {
  const lot = new Lot(['.....', '.###.', '.....']);
  const start = { x: 0, y: 1 };
  const path = findPath(lot, start, [{ x: 4, y: 1 }]);
  assert.ok(path);
  assert.deepEqual(path.at(-1), { x: 4, y: 1 });
  let prev = start;
  for (const step of path) {
    assert.ok(lot.walkable(step.x, step.y));
    assert.ok(adjacent(prev, step));
    prev = step;
  }
});

test('findPath returns [] at goal and null when unreachable', () => {
  const lot = new Lot(['..#..', '..#..']);
  assert.deepEqual(findPath(lot, { x: 0, y: 0 }, [{ x: 0, y: 0 }]), []);
  assert.equal(findPath(lot, { x: 0, y: 0 }, [{ x: 4, y: 0 }]), null);
});

test('findPath does not cut diagonally between two walls', () => {
  const lot = new Lot(['.#', '#.']);
  assert.equal(findPath(lot, { x: 0, y: 0 }, [{ x: 1, y: 1 }]), null);
});

test('objects block tiles and expose stand tiles', () => {
  const lot = new Lot(['.....', '.....', '.....']);
  const sofa = lot.place('sofa', 1, 1);
  assert.equal(lot.walkable(2, 1), false);
  assert.equal(lot.objectAt(3, 1), sofa);
  const stands = lot.standTiles(sofa);
  assert.equal(stands.length, 8); // 3 above, 3 below, 1 each side
  lot.remove(sofa.uid);
  assert.equal(lot.walkable(2, 1), true);
});

test('canPlace rejects walls, doors, overlaps and Gimps', () => {
  const lot = new Lot(['..#D..', '......']);
  assert.equal(lot.canPlace('plant', 2, 0).ok, false);
  assert.equal(lot.canPlace('plant', 3, 0).ok, false);
  assert.equal(lot.canPlace('sofa', 4, 1).ok, false); // runs off the edge
  assert.equal(lot.canPlace('plant', 0, 0, [{ x: 0, y: 0 }]).ok, false);
  lot.place('plant', 0, 1);
  assert.equal(lot.canPlace('plant', 0, 1).ok, false);
  assert.equal(lot.canPlace('plant', 1, 1).ok, true);
});

test('starter lot: every object is usable and reachable from the front door', () => {
  const lot = buildStarterLot();
  for (const obj of lot.all()) {
    if (!CATALOG[obj.type].interactions.length) continue;
    const goals = lot.standTiles(obj);
    assert.ok(goals.length, `${obj.type} has no stand tiles`);
    assert.ok(findPath(lot, { x: 10, y: 13 }, goals), `${obj.type} unreachable`);
  }
});

test('lot serialization round-trips', () => {
  const lot = buildStarterLot();
  const copy = Lot.deserialize(JSON.parse(JSON.stringify(lot.serialize())));
  assert.equal(copy.all().length, lot.all().length);
  assert.deepEqual(copy.serialize(), lot.serialize());
});
