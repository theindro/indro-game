# Architecture

## Stack

* **Vite + React 19** — UI shell, Ant Design overlays.
* **PixiJS 8** — game canvas, scene graph, ticker.
* **Zustand 5 + persist** — single global store, `localStorage` for long-run progress.

## Runtime flow

1. `App.jsx` loads assets (`LoadingScreen`), syncs audio from store, mounts `GameApp`.
2. `GameApp` renders fullscreen `GameCanvas`, conditional HUD, `StartGameScreen`, `DeathScreen`, dev menus in DEV.
3. `useGame` effect calls `createGame()` once per mount / `restartGeneration` change.
4. `createGame` constructs Pixi `Application`, `world`, `OpenWorldManager`, combat, input listeners, **ticker** callback. Ticker reads latest `useGameStore.getState()` each frame for pause/death/title gate.

## Layering (Pixi)

Rough bottom → top on `world`:

* `groundLayer` — chunk tiles / biome fills.
* `debugLayer` — optional chunk outlines.
* `entityLayer` — player, mobs, props, shadows, VFX attachments (`sortableChildren`).

Separate overlays may exist on `stage` (not always tracked here).

## State boundaries

| Zustand | Pixi / locals |
|---------|----------------|
| Progression, inventory, stats, seeds, audio prefs | Mob positions, arrows, particles, chunk containers |
| `restartGeneration` forces new `createGame` | `colliders` array mutated by world/props |

## Dev / editor

* `WorldEditorController` + `editorBridge` connect React devtools to `OpenWorldManager` for placed props / loaded JSON worlds (`worldMode`).

## Cross-cutting

* **`src/game/constants.js`** — `GS`, speeds, `frameScale(dt)`, camera-related tuning shared by systems.
* **`src/game/devtool.js`** — debug hooks into store (e.g. collider viz).
