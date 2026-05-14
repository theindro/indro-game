# Refactor Notes & Technical Debt

## High value

* **Canvas mounting:** `initApp` prepends canvas to `document.body`; consider parenting to `GameCanvas` ref-only container for embeddability and tests.
* **Store vs Pixi duplication:** Some values exist in both store (`player.location`) and local variables (`px`, `py` in `index.js`) — document single source of truth per concern (simulation locals vs persist).

## World

* **POI pipeline:** `spawnedPOIs` in `OpenWorldManager` is read in chunk generation but may lack writers — either implement POI registration or remove dead path.
* **Loaded vs procedural:** Three `worldMode` paths increase branching; consider strategy objects per mode.

## Combat

* **Controller surface:** `createCombatController` is large; subsystems already split (`createArrowSystem`, etc.) — continue extracting self-contained units with explicit interfaces.

## React / UI

* **Pause vs start gate:** Esc handling split across `BottomRightMenu` and store flags; centralize keyboard routing if more overlays are added.

## Lint / hygiene

* Systematic pass: remove unused imports/vars, fix `react-hooks` warnings in inventory/level-up flows where they indicate real double-render risk.
