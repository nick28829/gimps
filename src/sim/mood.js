import { NEEDS } from '../config.js';

/** Temporary feelings. mood = points added to the mood score while active. */
export const MOODLETS = {
  well_rested: { label: 'Well Rested', icon: '😌', mood: 10, hours: 5 },
  fresh: { label: 'Squeaky Clean', icon: '✨', mood: 6, hours: 3 },
  tasty_meal: { label: 'Tasty Meal', icon: '😋', mood: 8, hours: 3 },
  burnt_food: { label: 'Ate Burnt Food', icon: '🤢', mood: -6, hours: 2 },
  embarrassed: { label: 'Embarrassed', icon: '😳', mood: -15, hours: 3 },
  floor_sleep: { label: 'Slept on the Floor', icon: '🥴', mood: -10, hours: 4 },
  energized: { label: 'Pumped Up', icon: '🔥', mood: 8, hours: 2 },
  proud_artist: { label: 'Proud Artist', icon: '🖼️', mood: 6, hours: 3 },
  new_stuff: { label: 'New Stuff!', icon: '🛍️', mood: 6, hours: 4 },
  good_chat: { label: 'Good Conversation', icon: '🗨️', mood: 5, hours: 2 },
};

/** Automatic feelings when a need runs low. */
export const NEED_MOODLETS = {
  hunger: { low: 'Hungry', crit: 'Starving', icon: '🍽️' },
  energy: { low: 'Tired', crit: 'Exhausted', icon: '🥱' },
  bladder: { low: 'Gotta Go', crit: 'Bursting!', icon: '😬' },
  hygiene: { low: 'Smelly', crit: 'Filthy', icon: '🦨' },
  fun: { low: 'Bored', crit: 'Bored Stiff', icon: '😑' },
  social: { low: 'Lonely', crit: 'Very Lonely', icon: '😔' },
};

const LOW = 30;
const CRIT = 12;

export function activeMoodlets(gimp, time) {
  const list = [];
  for (const m of gimp.moodlets) {
    if (m.expires <= time || !MOODLETS[m.id]) continue;
    list.push({ id: m.id, ...MOODLETS[m.id], expires: m.expires });
  }
  for (const n of NEEDS) {
    const v = gimp.needs[n];
    const info = NEED_MOODLETS[n];
    if (v < CRIT) list.push({ id: `need_${n}`, label: info.crit, icon: info.icon, mood: -12 });
    else if (v < LOW) list.push({ id: `need_${n}`, label: info.low, icon: info.icon, mood: -4 });
  }
  return list;
}

export function moodScore(gimp, time) {
  const avg = NEEDS.reduce((s, n) => s + gimp.needs[n], 0) / NEEDS.length;
  const bonus = activeMoodlets(gimp, time).reduce((s, m) => s + m.mood, 0);
  return Math.round((avg - 55) * 0.6 + bonus);
}

const LEVELS = [
  { min: 30, label: 'Ecstatic', emoji: '🤩', color: '#2fbf71' },
  { min: 12, label: 'Happy', emoji: '😊', color: '#7ccf5a' },
  { min: -8, label: 'Fine', emoji: '🙂', color: '#d8c440' },
  { min: -25, label: 'Uneasy', emoji: '😟', color: '#f0913a' },
  { min: -Infinity, label: 'Miserable', emoji: '😫', color: '#e2504c' },
];

export const moodLevel = (score) => LEVELS.find((l) => score >= l.min);

/** Happy Gimps learn faster and earn more. */
export const moodMultiplier = (score) => Math.min(1.4, Math.max(0.6, 1 + score / 100));
