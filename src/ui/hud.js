import { NEEDS, NEED_INFO, SKILLS, MAX_SKILL, SPEEDS, SPEED_LABELS, CURRENCY, xpForLevel } from '../config.js';
import { formatClock } from '../sim/clock.js';
import { activeMoodlets, moodLevel } from '../sim/mood.js';
import { drawGimpFigure } from '../render/renderer.js';

const $ = (sel) => document.querySelector(sel);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export const needColor = (v) => (v > 60 ? '#5cc58a' : v > 30 ? '#f2c14e' : '#ec6a5e');

/** Side panel + top bar for live mode. */
export class Hud {
  constructor({ onSpeed, onCancel, onFreeWill }) {
    this.onCancel = onCancel;
    this.clock = $('#clock');
    this.money = $('#money');
    this.name = $('#gimp-name');
    this.mood = $('#gimp-mood');
    this.queue = $('#queue');
    this.moodlets = $('#moodlets');
    this.skills = $('#skills');
    this.freeWill = $('#freewill');
    this.portrait = $('#portrait');
    this.toasts = $('#toasts');
    this.lastMoney = null;
    this.signatures = {};

    // speed buttons
    this.speedButtons = SPEEDS.map((_, i) => {
      const b = el('button', '', SPEED_LABELS[i]);
      b.title = i === 0 ? 'Pause (Space)' : `Speed ${i} (${i})`;
      b.addEventListener('click', () => onSpeed(i));
      $('#speed').appendChild(b);
      return b;
    });

    // need bars
    this.needEls = {};
    for (const n of NEEDS) {
      const row = el('div', 'need');
      const label = el('div', 'need-label');
      label.append(el('span', '', `${NEED_INFO[n].icon} ${NEED_INFO[n].label}`));
      const bar = el('div', 'bar');
      const fill = el('i');
      bar.appendChild(fill);
      row.append(label, bar);
      $('#needs').appendChild(row);
      this.needEls[n] = { fill, row };
    }

    this.freeWill.addEventListener('change', () => onFreeWill(this.freeWill.checked));
  }

  setSpeed(i) {
    this.speedButtons.forEach((b, k) => b.classList.toggle('active', k === i));
  }

  toast(text, kind = 'info') {
    const t = el('div', `toast ${kind}`, text);
    this.toasts.appendChild(t);
    while (this.toasts.children.length > 4) this.toasts.firstChild.remove();
    setTimeout(() => t.classList.add('fade'), 4500);
    setTimeout(() => t.remove(), 5000);
  }

  drawPortrait(gimp) {
    const ctx = this.portrait.getContext('2d');
    ctx.clearRect(0, 0, 128, 128);
    drawGimpFigure(ctx, 64, 74, gimp.look, { scale: 3.2 });
  }

  update(game) {
    this.clock.textContent = formatClock(game.time);
    const money = Math.floor(game.money);
    if (money !== this.lastMoney) {
      if (this.lastMoney != null) {
        this.money.classList.add('bump');
        setTimeout(() => this.money.classList.remove('bump'), 150);
      }
      this.money.textContent = `${CURRENCY} ${money.toLocaleString()}`;
      this.lastMoney = money;
    }

    const g = game.selected;
    if (!g) return;

    const lookSig = JSON.stringify(g.look);
    if (this.signatures.look !== lookSig) {
      this.drawPortrait(g);
      this.signatures.look = lookSig;
    }
    this.name.textContent = g.name;
    const lvl = moodLevel(g.mood(game));
    this.mood.textContent = `${lvl.emoji} ${lvl.label}`;
    this.mood.style.background = lvl.color;
    this.freeWill.checked = g.freeWill;

    for (const n of NEEDS) {
      const v = g.needs[n];
      const { fill, row } = this.needEls[n];
      fill.style.width = `${v}%`;
      fill.style.backgroundColor = needColor(v);
      row.title = `${NEED_INFO[n].label}: ${Math.round(v)}/100`;
    }

    this.renderQueue(g);
    this.renderMoodlets(g, game);
    this.renderSkills(g);
  }

  renderQueue(g) {
    const items = [g.current, ...g.queue].filter(Boolean);
    const sig = items.map((a) => `${a.uid}:${a.phase}`).join('|');
    if (sig !== this.signatures.queue) {
      this.signatures.queue = sig;
      this.queue.replaceChildren();
      if (!items.length) this.queue.appendChild(el('li', 'empty', g.freeWill ? 'Thinking about what to do…' : 'Waiting for instructions'));
      for (const a of items) {
        const li = el('li', a === g.current ? 'current' : '');
        li.dataset.uid = a.uid;
        li.appendChild(el('span', 'q-icon', a.icon));
        const text = el('div', 'q-text');
        text.appendChild(el('div', '', a.label));
        const status = a === g.current ? (a.phase === 'walking' ? 'On the way' : a.autonomous ? 'Free will' : 'Now') : 'Up next';
        text.appendChild(el('small', '', a.where ? `${status} · ${a.where}` : status));
        if (a === g.current && a.def?.duration) {
          const p = el('div', 'progress');
          p.appendChild(el('i'));
          text.appendChild(p);
        }
        li.appendChild(text);
        if (a.def?.cancelable !== false) {
          const x = el('button', '', '✕');
          x.title = 'Cancel';
          x.addEventListener('click', () => this.onCancel(a.uid));
          li.appendChild(x);
        }
        this.queue.appendChild(li);
      }
    }
    const a = g.current;
    const bar = this.queue.querySelector('li.current .progress i');
    if (bar && a) {
      let p = a.phase === 'doing' ? a.elapsed / a.def.duration : 0;
      if (a.def.until) p = Math.max(p, g.needs[a.def.until] / 100);
      bar.style.width = `${Math.min(100, p * 100)}%`;
    }
  }

  renderMoodlets(g, game) {
    const list = activeMoodlets(g, game.time);
    const sig = list.map((m) => m.id + m.label).join('|');
    if (sig === this.signatures.moodlets) return;
    this.signatures.moodlets = sig;
    this.moodlets.replaceChildren();
    if (!list.length) this.moodlets.appendChild(el('li', 'empty', 'Nothing in particular'));
    for (const m of list) {
      const li = el('li', m.mood < 0 ? 'neg' : '', `${m.icon} ${m.label} ${m.mood > 0 ? '+' : ''}${m.mood}`);
      this.moodlets.appendChild(li);
    }
  }

  renderSkills(g) {
    const sig = JSON.stringify(g.skills);
    if (sig === this.signatures.skills) return;
    this.signatures.skills = sig;
    this.skills.replaceChildren();
    for (const [key, info] of Object.entries(SKILLS)) {
      const s = g.skills[key];
      const row = el('div', 'skill');
      row.appendChild(el('span', '', `${info.icon} ${info.label}`));
      const pips = el('div', 'pips');
      for (let i = 0; i < MAX_SKILL; i++) {
        const pip = el('i');
        if (i < s.level) pip.className = 'on';
        else if (i === s.level && s.xp > 0) {
          pip.className = 'part';
          pip.style.setProperty('--p', `${Math.round((s.xp / xpForLevel(s.level)) * 100)}%`);
        }
        pips.appendChild(pip);
      }
      row.append(pips, el('b', '', s.level));
      this.skills.appendChild(row);
    }
  }
}
