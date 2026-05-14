# Known Bugs & Hazards

> Update this file when you confirm a reproducible bug or hazardous behavior. Remove entries when fixed.

## Confirmed / structural

* **Legacy saves without `worldSeed`:** merge assigns stable default `1337` for pre-seed saves (see `gameStore.js`). Not a crash, but all such saves share one layout until the player gets a new seed (e.g. New game).

## Tooling / quality

* **ESLint noise:** Many `no-unused-vars` and some React purity rules fire across `src/`; not all indicate runtime failure. Treat as cleanup backlog unless tied to a repro.

## Needs verification

* **Hydration vs `createGame` timing:** If `createGame` ever ran before Zustand rehydration completed, `worldSeed` could theoretically mismatch first paint; current flow relies on typical sync `localStorage` read. If issues appear, gate `createGame` on `useGameStore.persist.hasHydrated()`.

## Editor / dev

* **Test boss key** (`game/index.js`): spawns boss in world; ensure it does not conflict with production builds if keys are left enabled.
