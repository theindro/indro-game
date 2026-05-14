# Project Overview

**Voidhunt** (`package.json`) is a browser dungeon / open-world action game: **PixiJS v8** for rendering and simulation, **React 19** for UI overlays, **Vite** for build, **Zustand** for global game state with **localStorage persistence**.

**Entry:** `src/main.jsx` → `src/App.jsx` (asset gate + audio sync) → `src/components/GameApp.jsx` (shell UI) → `src/components/GameCanvas.jsx` → `src/hooks/useGame.js` boots `src/game/index.js` (`createGame`).

**Longer splits:** see `/docs/ARCHITECTURE.md`, `GAMEPLAY_SYSTEMS.md`, `PERFORMANCE.md`, `KNOWN_BUGS.md`, `REFACTOR_NOTES.md`.

---

# Architecture

| Layer | Responsibility |
|--------|-----------------|
| **React** | Menus (`StartGameScreen`, `PauseScreen`, `DeathScreen`), HUD (`PlayerAbilityBar`, `Inventory`, …), devtools |
| **Zustand** | Player progression, inventory, abilities meta, audio prefs, **world seed**, run flags (`showStartScreen`, `restartGeneration`) |
| **Pixi** | `Application` → `world` container (scaled, sorted), ticker-driven loop in `createGame` |
| **Game core** | `createGame` wires input, combat, open world, VFX, camera, minimap, cleanup |

**Simulation time:** loop uses `dt` (seconds), capped (`Math.min(deltaMS/1000, 0.05)`). Helpers like `frameScale(dt)` in `src/game/constants.js` align lerps with design-time 60fps assumptions.

**Hot reload:** `useGame` disposes Pixi on HMR / unmount; `restartGeneration` in store forces full remount on progress reset.

---

# Rendering Pipeline

1. `createGame` → `initApp()` builds `Application`, prepends canvas to `document.body`, cursor rules respect `showStartScreen`.
2. `world` `Container`: `groundLayer` → `debugLayer` → `entityLayer` (sortable; props/mobs/player by `zIndex` / Y).
3. `OpenWorldManager` adds chunk visuals to `groundLayer`; entities live on `entityLayer` via `WorldObjectManager`.
4. Global VFX: `src/game/GlobalEffects.js` (`VFX.init`); particles/float text ticked each frame.
5. Optional filters (e.g. dash afterimage blur) via `pixi-filters` / `pixi.js` `BlurFilter`.

---

# Entity System

| Kind | Creation / owner |
|------|-------------------|
| **Player** | `createPlayerEntity` (`src/game/entities/createPlayerEntity.js`) — `pCont`, HP chrome, shadow; animations via `tickAnimations` |
| **Mobs** | `WorldObjectManager.spawnMob` → `spawnMob` in `createMobController.js` — entity container + `createMobController` AI |
| **Bosses** | `createBossController.js` / `createBossEntity.js`; test spawn from `game/index.js` (dev key) |
| **Props** | `PropManager` (decorative), `InteractablePropManager` (chests, harvestables) |
| **Lists** | `createGame` holds `entities` `{ mobs, bosses, arrows, enemyProjs, drops }`; `openWorld.setEntitiesList(entities)` |

---

# Combat System

* **Orchestration:** `createCombatController` (`src/game/controllers/createCombatController.js`) — shooting, arrows, enemy projectiles, drops, hooks to `openWorld`, `colliders`, `playWeaponShoot`.
* **Arrows:** `createArrowSystem.js` subsystem; collisions via `collision.js` (`resolveVsColliders`, etc.).
* **Player damage / crits:** Zustand `damagePlayer`, `calculateCritDamage`, stats from `recalculateStats` (equipment + level scaling in `gameStore.js`).
* **Abilities:** `Dash.js` (store-backed cooldowns); combat uses `ArrowBarrage`, `RapidFire`, `FrostArrow` from `src/game/abilities/`.
* **Mobs:** Archetypes under `controllers/mobArchetypes/`; status effects `statusEffects.js`.

---

# World Generation

* **`OpenWorldManager`** (`src/game/world/OpenWorldManager.js`): chunk streaming, biome field from **seeded** noise, chunk **type** from weighted table + `seededRandom`, mob **packs** seeded per chunk, procedural / loaded / editor modes.
* **`worldSeed`:** persisted in Zustand (`gameStore.js`); passed into `OpenWorldManager` constructor. Same seed ⇒ same biomes, chunk rolls, prop placement (`PropManager.hash`), interactable placement, mob positions and `spawnRngSeed`-driven mob variety/patrol/loot rolls (see `createMobController.js`, `interactablePropManager.js`).
* **Managers:** `PropManager`, `InteractablePropManager`, `WorldObjectManager` (colliders + entity layer), `MinimapManager`, `ChunkMonitor`.

---

# Audio System

* **`src/game/utils/audioManager.js`** — music/SFX routing, mute/volume.
* **`App.jsx`** subscribes to Zustand `audio` slice and pushes into `audioManager`.
* Volumes / mute persisted with game store.

---

# Save System

* **`src/stores/gameStore.js`** — `persist` + `createJSONStorage(() => localStorage)`, key `voidhunt-game-v1`.
* **Persisted (partial):** `player`, `inventory`, `abilities` (cooldowns zeroed on load), `kills`, `worldSeed`, `audio`, `currentRoomIndex` (merged into `gameState`).
* **Ephemeral:** `world`, `app`, `colliders`, live arrays (`enemyProjs`, …), `showStartScreen`, `restartGeneration`, combat timers in store (`basicAttack`, `dash` cooldown ends).
* **Restart:** `restartGame()` resets progress slice, bumps `restartGeneration`, remounts Pixi via `useGame` dependency.
* **Title gate:** `StartGameScreen.jsx` — Continue vs New game; hydration via `useGameStore.persist.onFinishHydration`.

---

# Zustand Store Structure

* **Single store:** `useGameStore` — gameplay + meta + `persist` middleware + custom `merge` for nested `gameState.currentRoomIndex` and legacy `worldSeed` migration rule.
* **Important actions:** `recalculateStats`, `addItem` / `equipItem`, `damagePlayer`, `restartGame`, `continueFromTitle`, `togglePause` (no-op while `showStartScreen`).
* **Enchant scaling:** `ENCHANT_BONUS_PER_LEVEL`, `getEnchantedStatValue` exported from `gameStore.js`.

---

# Important Managers

| Manager | Role |
|---------|------|
| `OpenWorldManager` | Chunks, biome, props/interactables/mobs spawn, bounds, editor bridge |
| `WorldObjectManager` | Collider list, spawn mob, destroy mob, layer adds |
| `PropManager` / `InteractablePropManager` | Procedural props per chunk; loot uses seeded `_rollLoot` |
| `MinimapManager` | Minimap UI world sync |
| `CreateWeatherController` | Biome-linked weather; chunk-change callback in `game/index.js` |
| `assetManager` | Texture / sprite factory (`utils/assetManager.js`) |

---

# Performance Optimizations

* Chunk load **throttle** (`chunkUpdateInterval` ~100ms), pending chunk batch size cap in `OpenWorldManager.update`.
* **Ticker `dt` cap** reduces spiral-of-death on tab background.
* Dash **afterimages:** pooled sprites + `generateTexture` snapshot (`vfx/dashAfterimageEffect.js`).
* `entityLayer.sortableChildren` for Y-sort without full resort every entity manually where possible.

---

# Known Issues

* See **`docs/KNOWN_BUGS.md`** for a living list. ESLint reports many legacy unused vars / purity warnings across the repo (not all are runtime bugs).

---

# Technical Debt

* Consolidated notes: **`docs/REFACTOR_NOTES.md`**.
* `spawnedPOIs` map in `OpenWorldManager` appears unused for writes (POI path stub).
* `createGame` still prepends canvas to `body` (layout coupling); container ref in `useGame` is partially legacy.

---

# Important File References

| Area | Files |
|------|--------|
| Boot / loop | `src/game/index.js`, `src/hooks/useGame.js` |
| Constants / tuning | `src/game/constants.js` |
| Store | `src/stores/gameStore.js` |
| World | `src/game/world/OpenWorldManager.js`, `PropManager.js`, `interactablePropManager.js`, `WorldObjectManager.js` |
| Combat | `src/game/controllers/createCombatController.js`, `subsystems/createArrowSystem.js`, `createProjectileSystem.js` |
| Player | `src/game/entities/createPlayerEntity.js`, `controllers/createPlayerController.js` |
| Input | `src/game/controllers/createInputController.js` |
| UI shell | `src/components/GameApp.jsx`, `GameCanvas.jsx`, `screens/*.jsx`, `game-ui/*.jsx` |
| VFX | `src/game/GlobalEffects.js`, `src/game/vfx/dashAfterimageEffect.js` |
| Items | `src/game/items.js` |

---

# Important Conventions

* **Coordinates:** world/chunks often use `x,z` naming for ground plane; Pixi display `y` often maps to world `z`/`y` depending on subsystem — check call sites when wiring positions.
* **Seeding:** prefer `seededRandom` / `mobSeededUnit` + mixed integer seeds; avoid `Math.random()` in world layout or persist-relevant loot.
* **Imports:** ESM `.js` extensions in imports.

---

# Important Dependencies

* `pixi.js` ^8.18, `react` ^19, `zustand` ^5, `vite` ^8, `antd` ^6, `@ant-design/icons`, `pixi-filters`, `@pixi/filter-drop-shadow`, `simplex-noise`, `zustand/middleware/persist`.

---

# Performance Constraints

* Target: browser main thread; avoid unbounded new `Texture` per frame (afterimages destroy textures on pool release).
* Large open world: rely on chunk unload and collider cleanup on chunk unload.

---

# Naming Conventions

* `createX` / `initX` factory functions for systems; `tickX` / `update` per-frame.
* Zustand: `useGameStore`, actions as verbs on the store object.

---

# Current TODOs

* Keep **this file** and `/docs/*.md` in sync when changing architecture (persist fields, world pipeline, combat ownership).
* Replace remaining non-deterministic gameplay RNG where reproducibility is required (audit with repo-wide `Math.random` search outside world).

**Maintenance rule:** After any major system change, update the relevant section here + the matching `/docs/` file in the same PR / commit.
