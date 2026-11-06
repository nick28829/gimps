# Gimps 4 🏡

A cozy little life-sim that runs in your browser. Look after your Gimp's
needs, send them to work, level up their skills and fill the house with
nicer stuff.

No build step, no dependencies — just HTML, CSS and JavaScript modules.

## Play

ES modules need to be served over HTTP (opening `index.html` directly from
disk won't work), so start the tiny bundled server:

```bash
npm start
```

Then open <http://localhost:8080>. Any static server works too, e.g.
`python3 -m http.server 8080`. It can also be hosted as-is on GitHub Pages.

### Controls

| Action | How |
|---|---|
| Interact with an object | Click it, pick an action |
| Walk somewhere | Click the floor → *Go here* |
| Cancel an action | ✕ in the *Doing* list |
| Pause / speeds | `Space`, `1` `2` `3` or the top-bar buttons |
| Buy mode / Live mode | `B` / `L` |
| Drop item / close menu | `Esc` or right-click |

The game autosaves every in-game morning and when you close the tab.

## Develop

```bash
npm test
```

Runs the simulation unit tests with Node's built-in test runner (Node 18+).

- [`docs/PLAN.md`](docs/PLAN.md) — game design, architecture and milestones
- `src/sim/` — simulation (no DOM): game, Gimps, needs, mood, free will
- `src/world/` — lot grid, pathfinding, object catalog, starter house
- `src/render/` — canvas renderer
- `src/ui/` — HUD, menus, buy mode, dialogs

Adding a new object is usually just a new entry in
[`src/world/catalog.js`](src/world/catalog.js).
