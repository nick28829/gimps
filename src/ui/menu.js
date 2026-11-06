/** Small context menu shown when clicking something in the world. */
export class PopupMenu {
  constructor(container) {
    this.container = container;
    this.el = document.createElement('div');
    this.el.className = 'popup';
    this.el.hidden = true;
    container.appendChild(this.el);
    document.addEventListener(
      'pointerdown',
      (e) => {
        if (!this.el.hidden && !this.el.contains(e.target)) this.hide();
      },
      true,
    );
  }

  get open() {
    return !this.el.hidden;
  }

  /**
   * @param x,y   position relative to the container (px)
   * @param items [{icon, label, sub, disabled, action}]
   */
  show(x, y, title, items) {
    this.el.replaceChildren();
    if (title) {
      const t = document.createElement('div');
      t.className = 'p-title';
      t.textContent = title;
      this.el.appendChild(t);
    }
    for (const item of items) {
      const b = document.createElement('button');
      b.disabled = !!item.disabled;
      const icon = document.createElement('span');
      icon.textContent = item.icon ?? '';
      const label = document.createElement('span');
      label.textContent = item.label;
      b.append(icon, label);
      if (item.sub) {
        const sub = document.createElement('span');
        sub.className = 'p-sub';
        sub.textContent = item.sub;
        b.appendChild(sub);
      }
      b.addEventListener('click', () => {
        this.hide();
        item.action();
      });
      this.el.appendChild(b);
    }
    this.el.hidden = false;
    const maxX = this.container.clientWidth - this.el.offsetWidth - 4;
    const maxY = this.container.clientHeight - this.el.offsetHeight - 4;
    this.el.style.left = `${Math.max(4, Math.min(x, maxX))}px`;
    this.el.style.top = `${Math.max(4, Math.min(y, maxY))}px`;
  }

  hide() {
    this.el.hidden = true;
  }
}
