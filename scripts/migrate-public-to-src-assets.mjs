/**
 * One-time migration: copy game textures from public/ → src/assets/
 * Run: node scripts/migrate-public-to-src-assets.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const ASSETS = path.join(ROOT, 'src', 'assets');

/** @param {string} src @param {string} dest */
function copy(src, dest) {
    const absSrc = path.join(PUBLIC, src);
    if (!fs.existsSync(absSrc)) {
        console.warn(`  skip (missing): ${src}`);
        return false;
    }
    const absDest = path.join(ASSETS, dest);
    fs.mkdirSync(path.dirname(absDest), { recursive: true });
    fs.copyFileSync(absSrc, absDest);
    return true;
}

let copied = 0;
let skipped = 0;

/** @param {string} src @param {string} dest */
function migrate(src, dest) {
    if (copy(src, dest)) {
        copied++;
        return;
    }
    skipped++;
}

// ── Props (filenames = gameplay texture ids) ─────────────────────────────
for (let n = 1; n <= 8; n++) {
    migrate(`gameprops/moss-stone-${n}.png`, `props/stone${n}.png`);
}
for (const [src, id] of [
    ['1', 'snowstone1'],
    ['2', 'snowstone2'],
    ['3', 'snowstone3'],
    ['4', 'snowstone4'],
    ['5', 'snowstone5'],
    ['7', 'snowstone7'],
]) {
    migrate(`gameprops/snow-stone-${src}.png`, `props/${id}.png`);
}
for (let n = 1; n <= 3; n++) {
    migrate(`gameprops/bush-${n}.png`, `props/bush${n}.png`);
    migrate(`gameprops/tree${n}.png`, `props/tree${n}.png`);
}

// ── Interactables ─────────────────────────────────────────────────────────
const interactables = [
    ['gameprops/interactable/iron-ore.png', 'interactables/ore_iron.png'],
    ['gameprops/interactable/gold-ore.png', 'interactables/ore_gold.png'],
    ['gameprops/interactable/crystal-ore.png', 'interactables/ore_crystal.png'],
    ['gameprops/interactable/lava-ore.png', 'interactables/ore_lava.png'],
    ['gameprops/interactable/void-ore.png', 'interactables/ore_void.png'],
    ['gameprops/interactable/herb_green.png', 'interactables/herb_green.png'],
    ['gameprops/interactable/frostbloom.png', 'interactables/herb_ice.png'],
    ['gameprops/interactable/wood.png', 'interactables/log_pile.png'],
    ['gameprops/interactable/deadtree.png', 'interactables/dead_tree.png'],
];
for (const [src, dest] of interactables) migrate(src, dest);

// Chest / container placeholders (source art never committed under rpg/props)
migrate('rpg/chest.png', 'interactables/chest_wood.png');
migrate('rpg/chest.png', 'interactables/chest_iron.png');
migrate('rpg/chest.png', 'interactables/chest_gold.png');
migrate('rpg/chest.png', 'interactables/chest_ancient.png');
migrate('rpg/wood.png', 'interactables/barrel.png');
migrate('rpg/resources/12.png', 'interactables/crate.png');

// ── Weapons / equipment (textureId = filename) ────────────────────────────
for (let n = 1; n <= 6; n++) migrate(`rpg/armour/${n}.png`, `weapons/boots_${n}.png`);
for (let n = 16; n <= 24; n++) migrate(`rpg/armour/${n}.png`, `weapons/gloves_${n}.png`);
for (let n = 30; n <= 35; n++) migrate(`rpg/armour/${n}.png`, `weapons/chest_${n}.png`);
for (let n = 48; n <= 52; n++) migrate(`rpg/armour/${n}.png`, `weapons/helmet_${n}.png`);
for (let n = 90; n <= 100; n++) migrate(`rpg/armour/${n}.png`, `weapons/ring_${n}.png`);
for (let n = 107; n <= 114; n++) migrate(`rpg/armour/${n}.png`, `weapons/amulet_${n}.png`);

migrate('gameprops/items/woodbow.png', 'weapons/woodbow.png');
migrate('gameprops/items/crystalbow.png', 'weapons/crystalbow.png');
migrate('gameprops/items/voidbow.png', 'weapons/voidbow.png');

// Crafting item icons
const resources = [
    ['22.png', 'wood_plank'],
    ['9.png', 'iron_ingot'],
    ['13.png', 'gold_ingot'],
    ['8.png', 'crystal_shard'],
    ['10.png', 'lava_stone'],
];
for (const [src, id] of resources) migrate(`rpg/resources/${src}`, `weapons/${id}.png`);
migrate('rpg/resources/hemp.png', 'weapons/herb.png');
migrate('rpg/resources/silkweed.png', 'weapons/frostbloom.png');

// ── VFX ───────────────────────────────────────────────────────────────────
const vfxFiles = ['burst', 'explosion', 'explosion_v2', 'blue-fire', 'glow', 'glow2', 'zap'];
for (const name of vfxFiles) {
    const srcName = name === 'blue-fire' ? 'blue-fire.png' : `${name}.png`;
    const destName = name === 'blue-fire' ? 'blue_fire.png' : `${name}.png`;
    migrate(`vfx/${srcName}`, `vfx/${destName}`);
}

// ── UI drops ──────────────────────────────────────────────────────────────
migrate('gold.png', 'ui/gold.png');
migrate('void_essence.png', 'ui/void_essence.png');
migrate('diamond.png', 'ui/diamond.png');

// ── World ground ────────────────────────────────────────────────────────────
migrate('lava-ground.png', 'world/lava-ground.png');
migrate('snow-ground.png', 'world/snow-ground.png');
migrate('grass-ground.jpg', 'world/grass-ground.jpg');
migrate('desert-ground.png', 'world/desert-ground.png');
migrate('lava/aaaaa.png', 'world/lava-texture.png');

console.log(`\nDone: ${copied} copied, ${skipped} skipped (missing source).`);
console.log(`Assets root: ${ASSETS}`);
