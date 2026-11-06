import { CATALOG, CATEGORIES } from '../world/catalog.js';
import { CURRENCY, SELL_REFUND } from '../config.js';

/** The Buy mode catalog in the side panel. */
export class BuyPanel {
  constructor({ onPick, onSellTool }) {
    this.root = document.querySelector('#catalog');
    this.sellBtn = document.querySelector('#sell-tool');
    this.cards = new Map();
    this.detail = document.createElement('div');
    this.detail.className = 'item-detail';

    for (const cat of CATEGORIES) {
      const h = document.createElement('h3');
      h.textContent = cat;
      const grid = document.createElement('div');
      grid.className = 'catalog-grid';
      for (const [type, def] of Object.entries(CATALOG)) {
        if (def.category !== cat) continue;
        const card = document.createElement('button');
        card.className = 'item';
        card.title = def.description;
        const icon = document.createElement('span');
        icon.className = 'i-icon';
        icon.textContent = def.icon;
        const name = document.createElement('span');
        name.textContent = def.name;
        const price = document.createElement('span');
        price.className = 'i-price';
        price.textContent = `${CURRENCY} ${def.price}`;
        const size = document.createElement('span');
        size.className = 'i-size';
        size.textContent = `${def.w}×${def.h}`;
        card.append(icon, name, price, size);
        card.addEventListener('click', () => onPick(type));
        card.addEventListener('pointerenter', () => this.describe(type));
        grid.appendChild(card);
        this.cards.set(type, card);
      }
      this.root.append(h, grid);
    }
    this.root.appendChild(this.detail);
    this.describe(null);
    this.sellBtn.addEventListener('click', () => onSellTool());
  }

  describe(type) {
    if (!type) {
      this.detail.textContent = `Pick an item, then click the lot to place it. Selling refunds ${SELL_REFUND * 100}%.`;
      return;
    }
    const def = CATALOG[type];
    const uses = def.interactions.map((i) => i.label).join(', ') || 'Just looks nice.';
    this.detail.replaceChildren();
    const b = document.createElement('b');
    b.textContent = `${def.icon} ${def.name}`;
    const p = document.createElement('div');
    p.textContent = def.description;
    const u = document.createElement('div');
    u.style.color = 'var(--muted)';
    u.textContent = uses;
    this.detail.append(b, p, u);
  }

  update(game, view) {
    for (const [type, card] of this.cards) {
      card.classList.toggle('active', view.buyType === type);
      card.classList.toggle('poor', game.money < CATALOG[type].price);
    }
    this.sellBtn.classList.toggle('active', view.sellTool);
  }
}
