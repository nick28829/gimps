import { Lot } from './lot.js';

// 22 × 15 tiles. Bedroom (carpet), bathroom (tile), kitchen, living room (wood).
const MAP = [
  '......................',
  '.####################.',
  '.#ccccccc#tttt#kkkkk#.',
  '.#ccccccc#tttt#kkkkk#.',
  '.#ccccccc#tttt#kkkkk#.',
  '.#ccccccc#tttt#kkkkk#.',
  '.#ccccccc#tttt#kkkkk#.',
  '.####D######D###DD###.',
  '.#wwwwwwwwwwwwwwwwww#.',
  '.#wwwwwwwwwwwwwwwwww#.',
  '.#wwwwwwwwwwwwwwwwww#.',
  '.#wwwwwwwwwwwwwwwwww#.',
  '.#########DD#########.',
  '..........pp..........',
  '..........pp..........',
];

const OBJECTS = [
  // bedroom
  ['bed_single', 2, 2],
  ['bookshelf', 8, 2],
  ['lamp', 8, 6],
  ['plant', 2, 6],
  // bathroom
  ['toilet', 10, 2],
  ['shower', 13, 2],
  // kitchen
  ['fridge', 15, 2],
  ['stove', 16, 2],
  ['lamp', 19, 6],
  // living room
  ['tv', 6, 8],
  ['sofa', 5, 11],
  ['computer', 19, 8],
  ['phone', 14, 8],
  ['lamp', 2, 8],
  ['plant', 19, 11],
  // garden
  ['plant', 8, 13],
  ['plant', 13, 13],
];

export const START_TILE = { x: 10, y: 13 };

export function buildStarterLot() {
  const lot = new Lot(MAP);
  for (const [type, x, y] of OBJECTS) lot.place(type, x, y);
  return lot;
}
