# Gameplay Systems

## Player

* **Entity:** `src/game/entities/createPlayerEntity.js` — container, body, HP bar, shadow; returns `tickAnimations`, `playWeaponShoot`.
* **Movement:** `game/index.js` `handlePlayerMovement` + `createPlayerController.js` for HP bar / bob sync.
* **Dash:** `src/game/abilities/Dash.js` — reads input + store stats (`dashRange`, `dashDuration`, `dashCooldown` as seconds); exposes `tryDash`, `update`, `isDashing`.
* **Afterimages:** `src/game/vfx/dashAfterimageEffect.js` — pooled sprites, `generateTexture` snapshot of `pCont`, optional blur/glow; updated from main loop when `movement.dashing`.

## Combat

* **Hub:** `src/game/controllers/createCombatController.js` — wires arrow system, enemy projectiles, drops, boss hooks, shooting entry points.
* **Arrows:** `src/game/controllers/subsystems/createArrowSystem.js`.
* **Basic attack:** store `useBasicAttack()` for cooldown sync with UI; shooting uses player stats from store.
* **Abilities:** `ArrowBarrage.js`, `RapidFire.js`, `FrostArrow.js` — level gates in `game/index.js` key handlers.
* **Mobs:** `createMobController.js` — patrol/chase, archetype delegation under `mobArchetypes/`; `spawnMob` accepts optional `spawnSeed` for deterministic variety + patrol.

## World

* **Streaming:** `OpenWorldManager` loads/unloads chunks in a radius; procedural vs JSON/editor paths.
* **Collisions:** `src/game/world/collision.js` — `resolveVsColliders`, debug toggles.
* **Interactables:** `interactablePropManager.js` + `interactablePropConfig.js` — E interaction, harvest bars, seeded loot.

## Meta / economy

* **Items:** `src/game/items.js` (`ItemDatabase`), crafting UI `components/game-ui/Crafting.jsx`.
* **Inventory / equip:** store `equipItem`, `unequipItem`, `recalculateStats` merges equipment into `player.stats`.

## UI gameplay

* `PlayerAbilityBar.jsx` — cooldown display tied to store abilities + `performance.now()`.
* `BottomRightMenu.jsx` — panels, Esc pause, embeds `PauseScreen`.
