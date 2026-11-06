# Gimps 4 — Game Plan

A small, cozy **life-simulation** game that runs in the browser. You look after
little people called **Gimps**: keep their needs topped up, help them build
skills and earn Gimpcoins, and fill their house with nicer stuff.

It is a life-sim in the classic genre sense (needs, free will, buy/build
modes, skills), with its **own** look, names, items and humour. We don't copy
art, UI, sounds, terminology or icons from any existing game.

---

## 1. Design pillars

1. **Readable at a glance.** Top-down 2D, chunky tiles, emoji-style icons.
   You always know what a Gimp wants and what it's doing.
2. **Cozy, not punishing.** Bad things happen (accidents, passing out, burnt
   food) but they're funny setbacks, never game over.
3. **Small systems that combine.** Needs → mood → skill gain/pay → money →
   better objects → better needs recovery. Every system feeds another.
4. **Zero install.** Plain HTML/CSS/JavaScript (ES modules), no build step,
   no dependencies. Open it, play it. Host anywhere static (e.g. GitHub Pages).

## 2. Core loop

```
 needs decay ──► Gimp (or you) picks an interaction ──► walk there ──► use object
      ▲                                                                   │
      │                                                                   ▼
 buy better objects ◄── earn Gimpcoins ◄── skills & mood ◄── needs refilled, moodlets
```

## 3. Systems

### 3.1 Time
- Game clock with days of the week. **1× = 1 game minute per real second**
  (a game day ≈ 24 real minutes). Speeds: pause, 1×, 4×, 12×.
- Day/night lighting; lamps light up rooms at night.

### 3.2 Needs (0–100, decay per game hour)
| Need    | Refilled by                     |
|---------|---------------------------------|
| Hunger  | fridge snacks, cooking          |
| Energy  | bed, sofa nap                   |
| Bladder | toilet                          |
| Hygiene | shower, bath                    |
| Fun     | TV, games, arcade, books, art   |
| Social  | phone, chatting online (later: other Gimps) |

Critical failures (cozy versions):
- Bladder hits 0 → accident, hygiene drop, *Embarrassed* moodlet.
- Energy hits 0 → passes out on the floor, *Slept on the Floor* moodlet.
- Low needs add negative moodlets (*Hungry*, *Starving*, …).

### 3.3 Mood
- Mood score = needs average + active **moodlets** (temporary feelings like
  *Well Rested*, *Tasty Meal*, *Embarrassed*).
- Levels: Miserable → Uneasy → Fine → Happy → Ecstatic.
- Mood multiplies skill gain and pay (happy Gimps work better).

### 3.4 Free will (autonomy)
- Each interaction **advertises** how much it helps each need.
- Score = Σ advertised gain × urgency(need) (urgency grows sharply as a need
  drops), plus small situational bonuses (sleep at night, work when broke),
  divided by distance. Pick randomly among the best few → believable, not robotic.
- Player commands always override autonomous actions. Free will can be turned off.

### 3.5 Actions & movement
- Click an object → menu of its interactions → added to the **action queue**
  (max 6, cancellable).
- A* pathfinding on the tile grid (8 directions, no corner cutting).
- Objects can be busy, unreachable, or unaffordable — Gimps report it.

### 3.6 Skills
Cooking, Logic, Charisma, Fitness, Creativity (levels 0–10).
- Cooking: fewer burnt meals, *Tasty Meal* moodlets.
- Logic: higher freelance pay.
- Creativity: paintings sell for more.
- Fitness: energy drains slower.
- Charisma: (later) better social interactions.

### 3.7 Money
- Currency: **Gimpcoins (🪙)**. Start with 400.
- Earn: freelance work on the computer, selling paintings.
  Later: careers with schedules and promotions.
- Spend: groceries (food interactions cost coins), buy mode.
  Later: weekly bills.

### 3.8 Buy mode
- Catalog by category, price, footprint. Ghost preview (green/red) on the grid.
- Placement rules: inside the lot, not on walls/doors/other objects/Gimps.
- Sell tool: 50% refund.

### 3.9 Build mode (later)
- Paint walls/floors, place doors, expand rooms. Walls are tiles on the grid,
  so build mode edits the same tile map the game already uses.

### 3.10 Households & relationships (later)
- Multiple Gimps per house, switch between them.
- Relationship values (friendship / romance), social interactions
  (chat, joke, hug, argue), visitors knocking on the door.

### 3.11 Create a Gimp
- Name + skin/hair/shirt colours (in M1).
- Later: traits (e.g. *Neat*, *Lazy*, *Foodie*, *Night Owl*) that tweak need
  decay and autonomy, plus a life goal ("aspiration-lite").

### 3.12 Saving
- `localStorage` save/load, autosave each new game day and on page close.

---

## 4. Technical architecture

Vanilla JS ES modules, HTML5 Canvas for the world, DOM for UI.
Simulation code has **no DOM dependencies** so it's unit-tested with Node's
built-in test runner.

```
index.html, styles.css
src/
  config.js            tuning constants (speeds, needs, skills)
  main.js              bootstrap, game loop, input wiring
  sim/
    game.js            Game: clock, money, lot, gimps, buy/sell, save data
    gimp.js            Gimp: needs, action queue, walking, performing
    autonomy.js        free-will scoring
    mood.js            moodlets, mood score & levels
    clock.js           time formatting, daylight
    save.js            localStorage
  world/
    catalog.js         every buyable object & its interactions (data-driven)
    lot.js             tile grid, walls, object placement, occupancy
    pathfinding.js     A*
    starterLot.js      the starter house
  render/renderer.js   canvas drawing (floors, objects, Gimps, lighting)
  ui/                  HUD, popup menu, buy panel, create-a-Gimp
tests/                 node --test unit tests for sim/world
scripts/serve.js       tiny zero-dependency static server
```

Key design choices:
- **Fixed-step simulation** (≤ 0.5 game min per step) decoupled from
  rendering, so 12× speed behaves the same as 1×.
- **Data-driven objects**: adding an item = adding an entry in `catalog.js`
  (footprint, price, interactions with effects/advertisements/skills/pay).
- Effects are rates per game hour; a need listed in an interaction's effects
  replaces its normal decay while the interaction runs.

---

## 5. Milestones

### M1 — Playable vertical slice ✅ (this first build)
- [x] Starter house with rooms, doors, garden
- [x] One Gimp with 6 needs, mood, moodlets, 5 skills
- [x] ~16 objects with interactions, costs, skill gain, pay
- [x] Click-to-interact menus, action queue, cancel
- [x] A* pathfinding, free will, critical failures
- [x] Time controls, day/night, lamps
- [x] Buy mode (place + sell) with placement validation
- [x] Create-a-Gimp (name + colours)
- [x] Save/load/autosave
- [x] Unit tests for the simulation

### M2 — Making a living
- [ ] Careers (job hours, carpool, performance, promotions)
- [ ] Weekly bills; consequences for not paying (cozy: lights go out)
- [ ] Object rotation; more objects; object quality tiers
- [ ] Sound effects + simple music toggle

### M3 — Build mode
- [ ] Wall/door/floor tools, room detection
- [ ] Wallpaper/floor colours, undo
- [ ] Bigger lots

### M4 — Households & relationships
- [ ] Multiple Gimps, household switcher
- [ ] Relationship bars, social interaction menu
- [ ] Visitors / neighbours

### M5 — Personality & goals
- [ ] Traits affecting decay & autonomy
- [ ] Life goals with rewards
- [ ] Random events (fire from cooking, broken objects + repair skill)

### M6 — Polish
- [ ] Animations, particles, better art pass
- [ ] Room-aware lighting (lamp light currently bleeds through walls)
- [ ] Mobile/touch layout improvements
- [ ] Tutorial / first-day hints
- [ ] GitHub Pages deployment workflow

## 6. Open questions
- Art direction: keep emoji + shapes, or move to hand-drawn sprites later?
- Top-down only, or try a fake-isometric view in a later milestone?
- Single household forever, or a small neighbourhood map?
