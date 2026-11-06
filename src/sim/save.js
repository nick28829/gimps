import { Game } from './game.js';

const KEY = 'gimps4.save.v1';

export function saveGame(game) {
  try {
    localStorage.setItem(KEY, JSON.stringify(game.serialize()));
    return true;
  } catch (err) {
    console.warn('Save failed', err);
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? Game.deserialize(JSON.parse(raw)) : null;
  } catch (err) {
    console.warn('Load failed', err);
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}
