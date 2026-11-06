// Tuning constants for Gimps 4.

export const TILE = 40; // pixels per tile
export const SIM_STEP = 0.5; // max game minutes per simulation step
export const SPEEDS = [0, 1, 4, 12]; // game minutes per real second
export const SPEED_LABELS = ['⏸', '▶', '▶▶', '▶▶▶'];

export const NEEDS = ['hunger', 'energy', 'bladder', 'hygiene', 'fun', 'social'];

// decay = points lost per game hour
export const NEED_INFO = {
  hunger: { label: 'Hunger', icon: '🍔', decay: 6 },
  energy: { label: 'Energy', icon: '⚡', decay: 4.5 },
  bladder: { label: 'Bladder', icon: '🚽', decay: 9 },
  hygiene: { label: 'Hygiene', icon: '🧼', decay: 3.5 },
  fun: { label: 'Fun', icon: '🎈', decay: 6 },
  social: { label: 'Social', icon: '💬', decay: 4 },
};

export const SKILLS = {
  cooking: { label: 'Cooking', icon: '🍳' },
  logic: { label: 'Logic', icon: '🧠' },
  charisma: { label: 'Charisma', icon: '😎' },
  fitness: { label: 'Fitness', icon: '💪' },
  creativity: { label: 'Creativity', icon: '🎨' },
};
export const MAX_SKILL = 10;
/** Game hours of practice needed to go from `level` to `level + 1`. */
export const xpForLevel = (level) => 2 + level * 1.5;

export const WALK_SPEED = 3; // tiles per game minute
export const START_MONEY = 400;
export const START_TIME = 8 * 60; // Day 1, 08:00
export const SELL_REFUND = 0.5;
export const MAX_QUEUE = 6;
export const CURRENCY = '🪙';
