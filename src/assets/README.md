# Game assets (data-driven)

Assets under `src/assets/` are **auto-discovered at build time** via Vite `import.meta.glob`.
No manual registration in `assetManager.js` is required.

## Layout

```
src/assets/
  props/           # stone1.png, tree1.png, bush1.png, …
  interactables/   # ore_iron.png, chest_wood.png, …
  weapons/         # boots_1.png, ring_90.png, woodbow.png, …
  vfx/             # burst.png + burst.json (spritesheet meta)
  ui/              # gold.png, void_essence.png
  world/           # grass-ground.jpg, lava-ground.png, …
```

Gameplay code uses **short texture ids** (`ore_iron`, `stone1`, `boots_1`). Discovery registers a dot-path id (`interactables.ore_iron`) and an **alias** equal to the filename (no extension).

## ID convention

| Path | Registry id | `getTexture()` id |
|------|-------------|-------------------|
| `interactables/ore_iron.png` | `interactables.ore_iron` | `ore_iron` |
| `props/stone1.png` | `props.stone1` | `stone1` |
| `weapons/boots_1.png` | `weapons.boots_1` | `boots_1` |

## Metadata

### Spritesheet sidecar

```
vfx/burst.png
vfx/burst.json   →  { "schema": "spritesheet", "id": "burst", "frameWidth": 1024, … }
```

### Prop type variants

`props/type-definitions.pack.json` lists variant texture ids per prop type (`stone` → `stone1`…`stone8`).

### Pack manifests (optional)

Empty `*.pack.json` files are kept for mod packs. Add `"entries": [{ "id": "my_tex", … }]` for external URLs or extra metadata.

### Interactable gameplay def

```json
{
  "schema": "interactable",
  "id": "ore_iron",
  "texture": "ore_iron",
  "radius": 30,
  "lootTable": "ore_iron"
}
```

Merged over static defaults in `interactablePropConfig.data.js` after load.

## Migrating from `public/`

```bash
node scripts/migrate-public-to-src-assets.mjs
```

Copies binaries from `public/gameprops`, `public/vfx`, `public/rpg`, etc. into the layout above. Re-run after adding new files under `public/`.

## Runtime

1. `LoadingScreen` → `assetManager.loadAssets()`
2. `discoverAssetManifest()` — scan globs, fill `assetRegistry`
3. `loadDiscoveredTextures()` — Pixi `Assets.load` for each URL
4. `invalidateContentCache()` — rebuild interactable/prop getters from meta
