import { drawGimpFigure } from '../render/renderer.js';

export const SKINS = ['#fbe0c8', '#f1c7a1', '#d9a273', '#b07a4f', '#7d4f31', '#4e3020', '#b9e3a8', '#b7c8f5'];
export const HAIRS = ['#2b1d14', '#6b3e1f', '#c58b3b', '#f2d16b', '#e0e0e0', '#e35d9b', '#4f7fe0', '#5bb98c'];
export const SHIRTS = ['#46b38a', '#ff8a65', '#64b5f6', '#ba68c8', '#ffd54f', '#ef5350', '#4db6ac', '#8d6e63'];
const NAMES = ['Pip Wobble', 'Juno Fizz', 'Barnaby Crumb', 'Mika Sprout', 'Ozzie Pickle', 'Lulu Bramble', 'Toby Noodle', 'Rosa Quill', 'Ferris Puddle', 'Wren Biscuit'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const modal = () => document.querySelector('#modal');

function open(dialog) {
  const m = modal();
  m.replaceChildren(dialog);
  m.hidden = false;
}

export function closeModal() {
  modal().hidden = true;
  modal().replaceChildren();
}

export const modalOpen = () => !modal().hidden;

function swatchRow(colors, current, onPick) {
  const row = document.createElement('div');
  row.className = 'swatches';
  for (const c of colors) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.style.background = c;
    b.title = c;
    b.classList.toggle('active', c === current);
    b.addEventListener('click', () => {
      row.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
      b.classList.add('active');
      onPick(c);
    });
    row.appendChild(b);
  }
  return row;
}

/** Create-a-Gimp: name + colours. Calls onDone({name, look}). */
export function showCreateGimp(onDone, { cancellable = false } = {}) {
  const look = { skin: pick(SKINS), hair: pick(HAIRS), shirt: pick(SHIRTS) };
  const d = document.createElement('form');
  d.className = 'dialog';
  d.innerHTML = `
    <h2>Create a Gimp</h2>
    <p>Every legend starts with a name and a questionable shirt.</p>
    <div class="cag">
      <canvas width="280" height="320"></canvas>
      <div class="fields">
        <div class="field">
          <label for="cag-name">Name</label>
          <div style="display:flex;gap:6px">
            <input id="cag-name" type="text" maxlength="24" required />
            <button type="button" class="secondary" data-act="dice" title="Random name">🎲</button>
          </div>
        </div>
        <div class="field" data-row="skin"><label>Skin</label></div>
        <div class="field" data-row="hair"><label>Hair</label></div>
        <div class="field" data-row="shirt"><label>Shirt</label></div>
      </div>
    </div>
    <div class="actions">
      ${cancellable ? '<button type="button" class="secondary" data-act="cancel">Cancel</button>' : ''}
      <button type="submit" class="primary">Move in! 🏡</button>
    </div>`;
  const canvas = d.querySelector('canvas');
  const name = d.querySelector('#cag-name');
  name.value = pick(NAMES);

  const redraw = () => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGimpFigure(ctx, 140, 175, look, { scale: 6 });
  };
  for (const [key, colors] of [
    ['skin', SKINS],
    ['hair', HAIRS],
    ['shirt', SHIRTS],
  ]) {
    d.querySelector(`[data-row="${key}"]`).appendChild(
      swatchRow(colors, look[key], (c) => {
        look[key] = c;
        redraw();
      }),
    );
  }
  d.querySelector('[data-act="dice"]').addEventListener('click', () => {
    name.value = pick(NAMES);
  });
  d.querySelector('[data-act="cancel"]')?.addEventListener('click', closeModal);
  d.addEventListener('submit', (e) => {
    e.preventDefault();
    const n = name.value.trim() || pick(NAMES);
    closeModal();
    onDone({ name: n, look: { ...look } });
  });
  open(d);
  redraw();
  name.focus();
  name.select();
}

export function showHelp(onClose) {
  const d = document.createElement('div');
  d.className = 'dialog help';
  d.innerHTML = `
    <h2>How to play</h2>
    <ul>
      <li><b>Click an object</b> to see what your Gimp can do with it. Click the floor to walk.</li>
      <li>Keep the six <b>needs</b> up. Low needs make a Gimp grumpy; empty ones end in… incidents.</li>
      <li>With <b>free will</b> on, your Gimp looks after the basics alone — but won't go to work unless broke.</li>
      <li>Earn 🪙 with <b>freelance work</b> on the computer or by <b>painting</b> (buy an easel). Skills raise your pay.</li>
      <li>Happy Gimps learn faster and earn more.</li>
      <li><b>Buy mode</b>: pick an item and click to place it. Use the sell tool to get half back.</li>
      <li>Keys: <kbd>Space</kbd> pause, <kbd>1</kbd>–<kbd>3</kbd> speed, <kbd>B</kbd> buy, <kbd>L</kbd> live, <kbd>Esc</kbd> cancel.</li>
      <li>The game autosaves every morning and when you close the tab.</li>
    </ul>
    <div class="actions"><button class="primary" data-act="ok">Got it</button></div>`;
  d.querySelector('[data-act="ok"]').addEventListener('click', () => {
    closeModal();
    onClose?.();
  });
  open(d);
}

export function showConfirm(title, text, onYes) {
  const d = document.createElement('div');
  d.className = 'dialog';
  const h = document.createElement('h2');
  h.textContent = title;
  const p = document.createElement('p');
  p.textContent = text;
  const actions = document.createElement('div');
  actions.className = 'actions';
  const no = document.createElement('button');
  no.className = 'secondary';
  no.textContent = 'Never mind';
  no.addEventListener('click', closeModal);
  const yes = document.createElement('button');
  yes.className = 'primary';
  yes.textContent = 'Yes';
  yes.addEventListener('click', () => {
    closeModal();
    onYes();
  });
  actions.append(no, yes);
  d.append(h, p, actions);
  open(d);
}
