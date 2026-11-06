import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/sim/game.js';
import { chooseAutonomous } from '../src/sim/autonomy.js';
import { formatClock, darkness } from '../src/sim/clock.js';
import { moodScore, moodLevel } from '../src/sim/mood.js';
import { NEED_INFO, START_MONEY } from '../src/config.js';

const look = { skin: '#f1c7a1', hair: '#3b2a1e', shirt: '#5bb98c' };

function seeded(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function newGame() {
  const game = Game.newGame({ name: 'Testy', look }, { rng: seeded() });
  return { game, gimp: game.gimps[0] };
}

const firstOfType = (game, type) => game.lot.ofType(type)[0];

test('clock formatting and daylight', () => {
  assert.equal(formatClock(8 * 60), 'Mon · Day 1 · 08:00');
  assert.equal(formatClock(1440 + 13 * 60 + 5), 'Tue · Day 2 · 13:05');
  assert.equal(darkness(12 * 60), 0);
  assert.equal(darkness(23 * 60), 1);
});

test('needs decay over time when idle', () => {
  const { game, gimp } = newGame();
  gimp.freeWill = false;
  const before = gimp.needs.hunger;
  game.tick(60);
  assert.ok(Math.abs(before - gimp.needs.hunger - NEED_INFO.hunger.decay) < 1e-6);
});

test('a queued snack walks to the fridge, costs money and fills hunger', () => {
  const { game, gimp } = newGame();
  gimp.freeWill = false;
  gimp.needs.hunger = 20;
  const fridge = firstOfType(game, 'fridge');
  assert.ok(game.queueInteraction(gimp, fridge.uid, 'snack'));
  game.tick(60);
  assert.equal(game.money, START_MONEY - 3);
  assert.ok(gimp.needs.hunger > 40, `hunger ${gimp.needs.hunger}`);
  assert.equal(gimp.current, null);
  assert.equal(fridge.inUseBy, null);
});

test('sleeping restores energy and ends when rested', () => {
  const { game, gimp } = newGame();
  gimp.freeWill = false;
  gimp.needs.energy = 30;
  const bed = firstOfType(game, 'bed_single');
  game.queueInteraction(gimp, bed.uid, 'sleep');
  game.tick(1);
  let minutes = 0;
  while (gimp.current && minutes < 10 * 60) {
    game.tick(1);
    minutes++;
  }
  assert.equal(gimp.current, null, 'woke up');
  assert.ok(gimp.needs.energy > 95);
  assert.ok(gimp.moodlets.some((m) => m.id === 'well_rested'));
});

test('free will goes for food when starving', () => {
  const { game, gimp } = newGame();
  for (const n of Object.keys(gimp.needs)) gimp.needs[n] = 100;
  gimp.needs.hunger = 5;
  for (let i = 0; i < 20; i++) {
    const choice = chooseAutonomous(gimp, game);
    assert.ok(choice.def.ad.hunger > 0, `picked ${choice.def.id}`);
  }
});

test('free will keeps a Gimp alive for two days', () => {
  const { game, gimp } = newGame();
  game.tick(2 * 24 * 60);
  for (const [n, v] of Object.entries(gimp.needs)) assert.ok(v > 5, `${n} = ${v}`);
});

test('player commands interrupt autonomous actions', () => {
  const { game, gimp } = newGame();
  game.tick(1);
  assert.ok(gimp.current?.autonomous);
  const phone = firstOfType(game, 'phone');
  game.queueInteraction(gimp, phone.uid, 'call');
  game.tick(0.5);
  assert.equal(gimp.current.def.id, 'call');
  assert.equal(gimp.current.autonomous, false);
});

test('cancelling removes queued and current actions', () => {
  const { game, gimp } = newGame();
  gimp.freeWill = false;
  const phone = firstOfType(game, 'phone');
  game.queueInteraction(gimp, phone.uid, 'call');
  game.queueInteraction(gimp, phone.uid, 'call');
  game.tick(0.5);
  assert.ok(gimp.cancel(gimp.queue[0].uid, game));
  assert.equal(gimp.queue.length, 0);
  assert.ok(gimp.cancel(gimp.current.uid, game));
  assert.equal(gimp.current, null);
});

test('bladder accident', () => {
  const { game, gimp } = newGame();
  gimp.freeWill = false;
  gimp.needs.bladder = 0.05;
  game.tick(1);
  assert.ok(gimp.needs.bladder > 99);
  assert.ok(gimp.moodlets.some((m) => m.id === 'embarrassed'));
  assert.ok(game.drainNotifications().some((n) => n.kind === 'bad'));
});

test('passing out at zero energy', () => {
  const { game, gimp } = newGame();
  gimp.freeWill = false;
  gimp.needs.energy = 0.01;
  game.tick(1);
  assert.equal(gimp.current.def.id, 'passout');
  assert.equal(gimp.cancel(gimp.current.uid, game), false);
  game.tick(240);
  assert.ok(gimp.moodlets.some((m) => m.id === 'floor_sleep'));
});

test('freelance work earns money and logic', () => {
  const { game, gimp } = newGame();
  gimp.freeWill = false;
  const pc = firstOfType(game, 'computer');
  game.queueInteraction(gimp, pc.uid, 'freelance');
  game.tick(150);
  assert.ok(game.money > START_MONEY + 25, `money ${game.money}`);
  assert.ok(gimp.skills.logic.xp > 0.5);
});

test('skills level up', () => {
  const { game, gimp } = newGame();
  gimp.gainSkill('cooking', 2.5, game);
  assert.equal(gimp.skills.cooking.level, 1);
  assert.ok(Math.abs(gimp.skills.cooking.xp - 0.5) < 1e-9);
});

test('buying and selling', () => {
  const { game } = newGame();
  const bad = game.buy('plant', 1, 1); // wall
  assert.equal(bad.ok, false);
  const ok = game.buy('plant', 0, 0);
  assert.ok(ok.ok);
  assert.equal(game.money, START_MONEY - 40);
  const sold = game.sell(ok.obj.uid);
  assert.equal(sold.refund, 20);
  assert.equal(game.money, START_MONEY - 20);
  assert.equal(game.buy('arcade', 0, 0).ok, false); // too expensive
});

test('selling an object in use stops the Gimp using it', () => {
  const { game, gimp } = newGame();
  gimp.freeWill = false;
  const phone = firstOfType(game, 'phone');
  game.queueInteraction(gimp, phone.uid, 'call');
  game.tick(10);
  assert.equal(gimp.current?.def.id, 'call');
  game.sell(phone.uid);
  assert.equal(gimp.current, null);
});

test('Gimps re-route when something is placed in their path', () => {
  const { game, gimp } = newGame();
  gimp.freeWill = false;
  const bed = firstOfType(game, 'bed_single');
  game.queueInteraction(gimp, bed.uid, 'nap');
  game.tick(0.5);
  const next = gimp.current.path.find((t) => game.canPlace('plant', t.x, t.y).ok);
  game.buy('plant', next.x, next.y);
  game.tick(10);
  assert.equal(gimp.current?.phase, 'doing');
});

test('mood reflects needs and moodlets', () => {
  const { game, gimp } = newGame();
  for (const n of Object.keys(gimp.needs)) gimp.needs[n] = 100;
  const happy = moodScore(gimp, game.time);
  gimp.addMoodlet('embarrassed', game);
  assert.ok(moodScore(gimp, game.time) < happy);
  for (const n of Object.keys(gimp.needs)) gimp.needs[n] = 5;
  assert.equal(moodLevel(moodScore(gimp, game.time)).label, 'Miserable');
});

test('save data round-trips', () => {
  const { game, gimp } = newGame();
  game.tick(90);
  game.buy('plant', 0, 0);
  const data = JSON.parse(JSON.stringify(game.serialize()));
  const loaded = Game.deserialize(data);
  assert.equal(loaded.money, game.money);
  assert.equal(loaded.time, game.time);
  assert.equal(loaded.lot.all().length, game.lot.all().length);
  assert.deepEqual(loaded.gimps[0].needs, gimp.needs);
  assert.equal(loaded.gimps[0].name, 'Testy');
  loaded.tick(30); // keeps running after load
});
