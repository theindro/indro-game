# Performance

## Frame budget

* Main loop `dt` capped in `src/game/index.js` to avoid huge catch-up steps when the tab was backgrounded.
* `frameScale(dt)` in `constants.js` rescales exponential-style lerps designed at ~60fps.

## World / rendering

* **Chunk throttling:** `OpenWorldManager` processes pending chunk loads in small batches per throttle window (`chunkUpdateInterval`).
* **Unload:** Far chunks removed from `loadedChunks`; props/interactables cleared per chunk keys to avoid unbounded memory.

## VFX

* **Dash afterimages:** object pool; `Texture.destroy` on pool release; optional `BlurFilter` (costly — keep quality low).
* **Particles / float text:** `particles.js`, `floatText.js` — ticked each frame; avoid spawning unbounded counts from combat without caps.

## Store / React

* Zustand `partialize` limits persist I/O size and avoids persisting huge transient arrays.
* Prefer selectors (`useGameStore(s => s.x)`) in HUD components to limit re-renders.

## Profiling tips

* Watch `OpenWorldManager` pending queue size and `entities.mobs.length` (PerformanceMonitor in world folder).
* GPU: `generateTexture` resolution clamped in dash afterimage effect.
