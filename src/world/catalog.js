// Every buyable object and what Gimps can do with it.
//
// Interaction fields:
//   duration     max game minutes
//   minDuration  don't stop early (via `until`) before this many minutes
//   until        stop as soon as this need is full
//   effects      { need: points per game hour } — replaces normal decay for that need
//   ad           { need: points } advertised to free will
//   adBonus      (gimp, game) => extra autonomy score
//   cost         Gimpcoins paid when the interaction starts
//   pay          (gimp) => Gimpcoins per game hour
//   skill        { name, rate } skill practice hours per game hour
//   snap         Gimp sits/lies on the object
//   via          use the nearest object of this type instead (e.g. TV → sofa)
//   onFinish     (gimp, game) => void, only when completed (not cancelled)
//   autonomous   false = only on player command

import { isNight } from '../sim/clock.js';

const nightSleepBonus = (g, game) => (isNight(game.time) ? (100 - g.needs.energy) * 0.6 : 0);

const sleep = (rate, alwaysRested) => ({
  id: 'sleep',
  label: 'Sleep',
  icon: '💤',
  duration: 600,
  minDuration: 90,
  until: 'energy',
  snap: true,
  effects: { energy: rate, hunger: -2.5, bladder: -3.5, hygiene: -1, fun: 0, social: -1 },
  ad: { energy: 70 },
  adBonus: nightSleepBonus,
  onFinish: (g, game) => {
    if (alwaysRested || g.needs.energy >= 95) g.addMoodlet('well_rested', game);
  },
});

export const CATEGORIES = ['Comfort', 'Bathroom', 'Kitchen', 'Fun', 'Skills', 'Decor'];

export const CATALOG = {
  bed_single: {
    name: 'Snoozy Single Bed',
    category: 'Comfort',
    price: 300,
    w: 1,
    h: 2,
    color: '#9ec5e8',
    shape: 'bed',
    icon: '🛏️',
    description: 'Gets the job done. Mostly.',
    interactions: [
      sleep(14, false),
      { id: 'nap', label: 'Take a nap', icon: '😴', duration: 60, snap: true, effects: { energy: 12, fun: 0 }, ad: { energy: 18 } },
    ],
  },
  bed_double: {
    name: 'Dreamy Double Bed',
    category: 'Comfort',
    price: 1000,
    w: 2,
    h: 2,
    color: '#c9a7e3',
    shape: 'bed',
    icon: '🛏️',
    description: 'Like sleeping on a cloud that pays rent.',
    interactions: [
      sleep(20, true),
      { id: 'nap', label: 'Take a nap', icon: '😴', duration: 60, snap: true, effects: { energy: 16, fun: 0 }, ad: { energy: 22 } },
    ],
  },
  sofa: {
    name: 'Squishy Sofa',
    category: 'Comfort',
    price: 380,
    w: 3,
    h: 1,
    color: '#e59866',
    shape: 'sofa',
    icon: '🛋️',
    description: 'Eats remotes. Nobody knows where they go.',
    interactions: [
      { id: 'relax', label: 'Relax', icon: '😌', duration: 30, snap: true, effects: { fun: 10, energy: 3 }, ad: { fun: 8, energy: 4 } },
      { id: 'sofa_nap', label: 'Nap on the sofa', icon: '😴', duration: 90, snap: true, effects: { energy: 10, fun: 0 }, ad: { energy: 16 } },
    ],
  },
  toilet: {
    name: 'Trusty Toilet',
    category: 'Bathroom',
    price: 120,
    w: 1,
    h: 1,
    color: '#f2f6f8',
    icon: '🚽',
    description: 'Reliable. Unglamorous. Essential.',
    interactions: [
      { id: 'use_toilet', label: 'Use the toilet', icon: '🚽', duration: 15, until: 'bladder', effects: { bladder: 900, hygiene: -6 }, ad: { bladder: 85 } },
    ],
  },
  shower: {
    name: 'Rainfall Shower',
    category: 'Bathroom',
    price: 350,
    w: 1,
    h: 1,
    color: '#bfe3f2',
    icon: '🚿',
    description: 'Great acoustics for singing badly.',
    interactions: [
      {
        id: 'shower',
        label: 'Take a shower',
        icon: '🚿',
        duration: 45,
        until: 'hygiene',
        effects: { hygiene: 220, fun: 0 },
        ad: { hygiene: 65 },
        onFinish: (g, game) => g.addMoodlet('fresh', game),
      },
    ],
  },
  bathtub: {
    name: 'Bubbly Bathtub',
    category: 'Bathroom',
    price: 750,
    w: 2,
    h: 1,
    color: '#d6eef8',
    icon: '🛁',
    description: 'Bubbles included. Rubber duck sold separately (it isn’t).',
    interactions: [
      {
        id: 'bath',
        label: 'Take a bubble bath',
        icon: '🛁',
        duration: 70,
        until: 'hygiene',
        snap: true,
        effects: { hygiene: 130, fun: 16, energy: 2 },
        ad: { hygiene: 60, fun: 15 },
        onFinish: (g, game) => g.addMoodlet('fresh', game),
      },
    ],
  },
  fridge: {
    name: 'Chillmaster Fridge',
    category: 'Kitchen',
    price: 400,
    w: 1,
    h: 1,
    color: '#e8eef2',
    icon: '🧊',
    description: 'Hums quietly. Judges your snacking.',
    interactions: [
      { id: 'snack', label: 'Grab a snack', icon: '🥪', cost: 3, duration: 12, effects: { hunger: 150 }, ad: { hunger: 30 } },
      { id: 'quick_meal', label: 'Microwave dinner', icon: '🍱', cost: 6, duration: 25, effects: { hunger: 130 }, ad: { hunger: 45 } },
    ],
  },
  stove: {
    name: 'Sizzle Stove',
    category: 'Kitchen',
    price: 450,
    w: 1,
    h: 1,
    color: '#cfd4d8',
    icon: '🍳',
    description: 'Four burners, zero excuses.',
    interactions: [
      {
        id: 'cook',
        label: 'Cook a hearty meal',
        icon: '🍲',
        cost: 10,
        duration: 50,
        effects: { hunger: 110, fun: 2 },
        ad: { hunger: 70 },
        skill: { name: 'cooking', rate: 1 },
        onFinish: (g, game) => {
          const lvl = g.skills.cooking.level;
          if (game.rng() < Math.max(0, 0.3 - lvl * 0.1)) {
            g.needs.hunger = Math.max(0, g.needs.hunger - 30);
            g.addMoodlet('burnt_food', game);
            game.notify(`${g.name} burnt dinner. Crunchy! 🔥`, 'warn');
          } else if (lvl >= 3) {
            g.addMoodlet('tasty_meal', game);
          }
        },
      },
    ],
  },
  tv: {
    name: 'Glowbox TV',
    category: 'Fun',
    price: 500,
    w: 2,
    h: 1,
    color: '#3b3f4a',
    icon: '📺',
    description: '400 channels of cooking shows.',
    interactions: [
      { id: 'watch_tv', label: 'Watch TV', icon: '📺', duration: 90, until: 'fun', via: 'sofa', snap: true, effects: { fun: 30, energy: -3 }, ad: { fun: 42 } },
    ],
  },
  computer: {
    name: 'Clicky Computer',
    category: 'Fun',
    price: 800,
    w: 1,
    h: 1,
    color: '#8795a3',
    icon: '💻',
    description: 'Work, play, and doomscroll — all in one!',
    interactions: [
      {
        id: 'freelance',
        label: 'Do freelance work',
        icon: '💼',
        duration: 120,
        effects: { fun: -8, energy: -6 },
        pay: (g) => 18 * (1 + 0.25 * g.skills.logic.level),
        skill: { name: 'logic', rate: 0.4 },
        ad: {},
        adBonus: (g, game) => (game.money < 150 ? 30 : 6) * (g.needs.energy > 35 && g.needs.fun > 30 ? 1 : 0.2),
      },
      { id: 'gaming', label: 'Play video games', icon: '🎮', duration: 120, until: 'fun', effects: { fun: 28, energy: -3 }, ad: { fun: 40 }, skill: { name: 'logic', rate: 0.2 } },
      {
        id: 'chat',
        label: 'Chat online',
        icon: '💬',
        duration: 60,
        until: 'social',
        effects: { social: 35, fun: 6 },
        ad: { social: 40 },
        skill: { name: 'charisma', rate: 0.5 },
      },
    ],
  },
  phone: {
    name: 'Retro Phone',
    category: 'Fun',
    price: 80,
    w: 1,
    h: 1,
    color: '#e57373',
    icon: '☎️',
    description: 'Ring ring. It’s your friends. They miss you.',
    interactions: [
      {
        id: 'call',
        label: 'Call a friend',
        icon: '📞',
        duration: 40,
        until: 'social',
        effects: { social: 55, fun: 5 },
        ad: { social: 50 },
        skill: { name: 'charisma', rate: 0.6 },
        onFinish: (g, game) => g.addMoodlet('good_chat', game),
      },
    ],
  },
  arcade: {
    name: 'Pixel Blaster Arcade',
    category: 'Fun',
    price: 1200,
    w: 1,
    h: 1,
    color: '#7e57c2',
    icon: '👾',
    description: 'Insert coin. Lose weekend.',
    interactions: [
      { id: 'arcade', label: 'Play Pixel Blaster', icon: '👾', duration: 90, until: 'fun', effects: { fun: 50 }, ad: { fun: 62 } },
    ],
  },
  bookshelf: {
    name: 'Bookworm Shelf',
    category: 'Skills',
    price: 250,
    w: 1,
    h: 1,
    color: '#a1785b',
    icon: '📚',
    description: 'Smells like old paper and ambition.',
    interactions: [
      { id: 'read', label: 'Read a book', icon: '📖', duration: 60, effects: { fun: 10 }, ad: { fun: 18 }, skill: { name: 'logic', rate: 1 } },
    ],
  },
  easel: {
    name: 'Artsy Easel',
    category: 'Skills',
    price: 350,
    w: 1,
    h: 1,
    color: '#f3e5ab',
    icon: '🎨',
    description: 'Every masterpiece starts as a smudge.',
    interactions: [
      {
        id: 'paint',
        label: 'Paint & sell a picture',
        icon: '🖌️',
        duration: 90,
        effects: { fun: 12, energy: -4 },
        ad: { fun: 20 },
        skill: { name: 'creativity', rate: 1 },
        onFinish: (g, game) => {
          const lvl = g.skills.creativity.level;
          const price = Math.round((15 + 18 * lvl) * (0.8 + game.rng() * 0.4));
          game.earn(price);
          g.addMoodlet('proud_artist', game);
          game.notify(`${g.name} sold a painting for 🪙${price}!`, 'good');
        },
      },
    ],
  },
  treadmill: {
    name: 'Huff-n-Puff Treadmill',
    category: 'Skills',
    price: 600,
    w: 1,
    h: 2,
    color: '#5b636e',
    icon: '🏃',
    description: 'Going nowhere, fast.',
    interactions: [
      {
        id: 'workout',
        label: 'Work out',
        icon: '💪',
        duration: 60,
        effects: { fun: 4, energy: -12, hygiene: -15 },
        ad: { fun: 6 },
        adBonus: (g) => (g.needs.energy > 60 && g.needs.hygiene > 40 ? 8 : 0),
        skill: { name: 'fitness', rate: 1 },
        onFinish: (g, game) => g.addMoodlet('energized', game),
      },
    ],
  },
  plant: {
    name: 'Leafy Friend',
    category: 'Decor',
    price: 40,
    w: 1,
    h: 1,
    color: '#a5d6a7',
    icon: '🪴',
    description: 'Listens better than most people.',
    interactions: [{ id: 'water', label: 'Water the plant', icon: '💧', duration: 5, effects: { fun: 30 }, ad: { fun: 2 } }],
  },
  lamp: {
    name: 'Cozy Floor Lamp',
    category: 'Decor',
    price: 90,
    w: 1,
    h: 1,
    color: '#ffe8a3',
    icon: '💡',
    light: 3.2,
    description: 'Lights up a room at night.',
    interactions: [],
  },
};
