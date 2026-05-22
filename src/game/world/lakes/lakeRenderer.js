import { Assets, Container, Graphics, TilingSprite } from 'pixi.js';
import waterTextureUrl from '../../../assets/water-texture.avif';
import {
    LAKE_VISUAL_SQUASH_Y,
    getLakeShapeBounds,
    smoothPolygon,
} from './lakeGeometry.js';

/** @typedef {import('./lakeGen.js').LakeInstance} LakeInstance */

const LAKE_COLOR = '#62b2cf';
const LAKE_SHORE_COLOR = '#eab47a';

/** @type {Set<{ sprite: import('pixi.js').TilingSprite }>} */
const lakeAnimators = new Set();

let waterTexturePromise = null;

function loadWaterTexture() {
    if (!waterTexturePromise) {
        waterTexturePromise = Assets.load(waterTextureUrl);
    }
    return waterTexturePromise;
}

function scalePoly(pts, scale) {
    const n = pts.length / 2;
    let cx = 0, cy = 0;
    for (let i = 0; i < n; i++) { cx += pts[i*2]; cy += pts[i*2+1]; }
    cx /= n; cy /= n;
    return pts.map((v, i) => i % 2 === 0 ? cx + (v - cx) * scale : cy + (v - cy) * scale);
}

export function clearLakeAnimatorsForChunk(chunkContainer) {
    const list = chunkContainer?._lakeAnimators;
    if (!list?.length) return;
    for (const entry of list) lakeAnimators.delete(entry);
    chunkContainer._lakeAnimators = null;
}

export function tickLakeWaterAnimations(dt) {
    const step = (dt ?? 0.016) * 28;
    for (const entry of lakeAnimators) {
        const sprite = entry.sprite;
        if (!sprite || sprite.destroyed) { lakeAnimators.delete(entry); continue; }
        sprite.tilePosition.x += step * 0.3;
    }
}

export async function renderLakesIntoChunk(chunkContainer, lakes, chunkX, chunkZ, tileSize, chunkSize) {
    if (!lakes?.length || !chunkContainer) return;

    const texture = await loadWaterTexture();
    const animators = [];

    for (const lake of lakes) {
        const smoothed = smoothPolygon(lake.shape);
        const bounds = getLakeShapeBounds(smoothed);

        const lakeRoot = new Container();
        lakeRoot.position.set(lake.x, lake.z);
        lakeRoot.scale.y = LAKE_VISUAL_SQUASH_Y;

        const outerGlow = new Graphics();
        outerGlow.poly(scalePoly(smoothed, 1.2)).fill({ color: LAKE_COLOR, alpha: 0.35 });
        lakeRoot.addChild(outerGlow);

        const shoreBand = new Graphics();
        shoreBand.poly(scalePoly(smoothed, 1.15)).fill({ color: LAKE_COLOR, alpha: 0.45 });
        lakeRoot.addChild(shoreBand);

        const shoreFade = new Graphics();
        shoreFade.poly(scalePoly(smoothed, 1.1)).fill({ color: LAKE_COLOR, alpha: 0.55 });
        lakeRoot.addChild(shoreFade);

        const fill = new Graphics();

        const mask = new Graphics();
        mask.poly(smoothed).fill({ color: 0xffffff });

        const water = new TilingSprite({
            texture,
            width: bounds.width,
            height: bounds.height / LAKE_VISUAL_SQUASH_Y,
        });
        water.anchor.set(0.5, 0.5);
        water.position.set(bounds.cx, bounds.cz);
        water.alpha = 0.2;
        water.scale.y = LAKE_VISUAL_SQUASH_Y;
        water.blendMode = 'overlay';
        water.mask = mask;

        lakeRoot.addChild(water);
        lakeRoot.addChild(mask);

        chunkContainer.addChild(lakeRoot);

        const entry = { sprite: water };
        lakeAnimators.add(entry);
        animators.push(entry);
    }

    chunkContainer._lakeAnimators = animators;
}
