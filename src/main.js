import { SPEEDS, CURRENCY, SELL_REFUND } from './config.js';
import { Game } from './sim/game.js';
import { saveGame, loadGame, clearSave } from './sim/save.js';
import { CATALOG } from './world/catalog.js';
import { Renderer } from './render/renderer.js';
import { Hud } from './ui/hud.js';
import { BuyPanel } from './ui/buyPanel.js';
import { PopupMenu } from './ui/menu.js';
import { showCreateGimp, showHelp, showConfirm, modalOpen, closeModal } from './ui/dialogs.js';

const canvas = document.querySelector('#game');
const stage = document.querySelector('#stage');
const renderer = new Renderer(canvas);
const menu = new PopupMenu(stage);

let game = null;
let speed = 1;
let lastSpeed = 1; // restored by the space bar after pausing
const view = { mode: 'live', hover: null, buyType: null, sellTool: false };

// ---- UI wiring ------------------------------------------------------------------

const hud = new Hud({
  onSpeed: setSpeed,
  onCancel: (uid) => game?.selected?.cancel(uid, game),
  onFreeWill: (on) => {
    if (game?.selected) game.selected.freeWill = on;
  },
});

const buyPanel = new BuyPanel({
  onPick: (type) => {
    view.buyType = view.buyType === type ? null : type;
    view.sellTool = false;
  },
  onSellTool: () => {
    view.sellTool = !view.sellTool;
    view.buyType = null;
  },
});

function setSpeed(i) {
  speed = i;
  if (i) lastSpeed = i;
  hud.setSpeed(i);
}

function setMode(mode) {
  view.mode = mode;
  view.buyType = null;
  view.sellTool = false;
  menu.hide();
  document.querySelector('#live-panel').hidden = mode !== 'live';
  document.querySelector('#buy-panel').hidden = mode !== 'buy';
  document.querySelectorAll('#modes button').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
}

document.querySelectorAll('#modes button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));

document.querySelector('#btn-save').addEventListener('click', () => {
  if (game && saveGame(game)) hud.toast('Game saved. 💾', 'good');
  else hud.toast('Could not save (is storage blocked?)', 'bad');
});

document.querySelector('#btn-new').addEventListener('click', () => {
  showConfirm('Start a new life?', 'Your current Gimp, house and Gimpcoins will be lost.', () => {
    clearSave();
    newGame(true);
  });
});

document.querySelector('#btn-help').addEventListener('click', () => showHelp());

// ---- world input ------------------------------------------------------------------

canvas.addEventListener('pointermove', (e) => {
  if (!game) return;
  view.hover = renderer.tileFromEvent(e);
  canvas.style.cursor = view.hover && (view.mode === 'buy' || game.lot.objectAt(view.hover.x, view.hover.y)) ? 'pointer' : 'default';
});
canvas.addEventListener('pointerleave', () => {
  view.hover = null;
});

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  view.buyType = null;
  view.sellTool = false;
  menu.hide();
});

canvas.addEventListener('click', (e) => {
  if (!game) return;
  const tile = renderer.tileFromEvent(e);
  if (!tile) return;
  view.hover = tile;
  const rect = stage.getBoundingClientRect();
  const mx = e.clientX - rect.left + 6;
  const my = e.clientY - rect.top + 6;
  if (view.mode === 'buy') handleBuyClick(tile);
  else handleLiveClick(tile, mx, my);
});

function handleLiveClick(tile, mx, my) {
  const gimp = game.selected;
  if (!gimp) return;
  const obj = game.lot.objectAt(tile.x, tile.y);
  if (obj) {
    const def = CATALOG[obj.type];
    const items = def.interactions.map((i) => ({
      icon: i.icon,
      label: i.label,
      sub: i.cost ? `${CURRENCY}${i.cost}` : i.pay ? 'earns 🪙' : '',
      disabled: i.cost > game.money,
      action: () => game.queueInteraction(gimp, obj.uid, i.id),
    }));
    if (!items.length) items.push({ icon: '✨', label: 'Admire', sub: '', action: () => hud.toast(`${gimp.name} thinks the ${def.name.toLowerCase()} is lovely.`) });
    menu.show(mx, my, `${def.icon} ${def.name}`, items);
    return;
  }
  const clickedGimp = game.gimps.find((g) => g.tile.x === tile.x && g.tile.y === tile.y);
  if (clickedGimp) {
    game.selectedId = clickedGimp.id;
    return;
  }
  if (game.lot.walkable(tile.x, tile.y)) {
    menu.show(mx, my, null, [{ icon: '👣', label: 'Go here', action: () => game.queueWalk(gimp, tile.x, tile.y) }]);
  }
}

function handleBuyClick(tile) {
  if (view.sellTool) {
    const obj = game.lot.objectAt(tile.x, tile.y);
    if (!obj) return;
    const def = CATALOG[obj.type];
    const res = game.sell(obj.uid);
    if (res.ok) hud.toast(`Sold ${def.name} for ${CURRENCY}${res.refund}.`, 'info');
    return;
  }
  if (!view.buyType) {
    const obj = game.lot.objectAt(tile.x, tile.y);
    if (obj) {
      const def = CATALOG[obj.type];
      hud.toast(`${def.icon} ${def.name} — sells for ${CURRENCY}${Math.floor(def.price * SELL_REFUND)}. Use the sell tool to sell it.`);
    }
    return;
  }
  const res = game.buy(view.buyType, tile.x, tile.y);
  if (res.ok) hud.toast(`Bought ${CATALOG[view.buyType].name}! 🛍️`, 'good');
  else hud.toast(res.reason, 'warn');
}

// ---- keyboard -------------------------------------------------------------------

window.addEventListener('keydown', (e) => {
  if (modalOpen()) {
    if (e.key === 'Escape' && game) closeModal();
    return;
  }
  if (e.target instanceof HTMLInputElement) return;
  if (e.key === ' ') {
    e.preventDefault();
    setSpeed(speed === 0 ? lastSpeed : 0);
  } else if (['1', '2', '3'].includes(e.key)) setSpeed(Number(e.key));
  else if (e.key === 'b' || e.key === 'B') setMode('buy');
  else if (e.key === 'l' || e.key === 'L') setMode('live');
  else if (e.key === 'Escape') {
    menu.hide();
    view.buyType = null;
    view.sellTool = false;
  }
});

// ---- lifecycle --------------------------------------------------------------------

function attach(g) {
  game = g;
  renderer.setLot(game.lot);
  game.on('newDay', () => {
    saveGame(game);
    hud.toast(`Good morning! Day ${Math.floor(game.time / 1440) + 1} begins. (autosaved)`, 'info');
  });
  setMode('live');
  setSpeed(1);
}

function newGame(cancellable = false) {
  showCreateGimp(
    (gimp) => {
      attach(Game.newGame(gimp));
      saveGame(game);
      hud.toast(`Welcome home, ${gimp.name}! Click things to get started.`, 'good');
    },
    { cancellable },
  );
}

window.addEventListener('beforeunload', () => {
  if (game) saveGame(game);
});

const saved = loadGame();
if (saved) {
  attach(saved);
  hud.toast(`Welcome back, ${saved.selected?.name ?? 'friend'}!`, 'good');
} else {
  newGame(false);
}

// ---- main loop ---------------------------------------------------------------------

let last = performance.now();
let hudTimer = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (game) {
    const paused = modalOpen();
    if (!paused) game.tick(dt * SPEEDS[speed]);
    for (const n of game.drainNotifications()) hud.toast(n.text, n.kind);
    renderer.draw(game, view, now / 1000);
    hudTimer -= dt;
    if (hudTimer <= 0) {
      hud.update(game);
      if (view.mode === 'buy') buyPanel.update(game, view);
      hudTimer = 0.1;
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
