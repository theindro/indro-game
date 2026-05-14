/**
 * Pooled dash afterimages: snapshots the player container while dashing,
 * fades/shrinks/blurs over time, rendered behind the player on `parent`.
 */
import {BlurFilter, Sprite, Texture} from 'pixi.js';
import {assetManager} from '../utils/assetManager.js';

export const DEFAULT_DASH_AFTERIMAGE_CONFIG = {
    /** Seconds between spawns while dashing */
    spawnInterval: 0.042,
    /** Seconds until fully faded (then pooled) */
    fadeDuration: 0.38,
    /** Initial alpha (0–1) */
    startOpacity: 0.42,
    /** Multiply RGB (hex) */
    tint: 0x66ccff,
    /** Max simultaneous afterimages */
    maxTrail: 14,
    /** Scale multiplier at end of life (relative to spawn scale) */
    scaleEnd: 0.86,
    /** Optional glow under the snapshot (local sprite, same layer as trail) */
    glow: {
        enabled: false,
        texture: 'glow2',
        color: 'cyan',
        alpha: 0.82,
        scale: 0.35,
    },
    /** If true, blur strength ramps from 0 → blurEnd over fade */
    enableBlur: true,
    blurEnd: 1.15,
};

/**
 * @param {import('pixi.js').Renderer} renderer
 * @param {import('pixi.js').Container} parent  Layer below player (sortableChildren recommended)
 * @param {import('pixi.js').Container} playerRoot  `pCont` — texture source (HP bar / shadow hidden for capture)
 * @param {() => import('pixi.js').DisplayObject[]} getHiddenForSnapshot  Parts to hide during generateTexture
 * @param {Partial<typeof DEFAULT_DASH_AFTERIMAGE_CONFIG>} [config]
 */
export function createDashAfterimageEffect(renderer, parent, playerRoot, getHiddenForSnapshot, config = {}) {
    const cfg = {...DEFAULT_DASH_AFTERIMAGE_CONFIG, ...config};
    const glowCfg = {...DEFAULT_DASH_AFTERIMAGE_CONFIG.glow, ...(config.glow || {})};

    const pool = [];
    const active = [];
    let spawnAcc = 0;

    function makePooledEntry() {
        const sprite = new Sprite(Texture.EMPTY);
        sprite.anchor.set(0.5);
        sprite.eventMode = 'none';
        sprite.interactive = false;
        sprite.interactiveChildren = false;
        sprite.visible = false;

        let glow = null;
        if (glowCfg.enabled) {
            const tex = assetManager.getTexture(glowCfg.texture || 'glow2');
            if (tex) {
                glow = new Sprite(tex);
                glow.anchor.set(0.5);
                glow.blendMode = 'add';
                glow.tint = glowCfg.color ?? 0xffffff;
                glow.alpha = glowCfg.alpha ?? 0.2;
                glow.scale.set(glowCfg.scale ?? 1.05);
                sprite.addChildAt(glow, 0);
            }
        }

        const blurFilter = cfg.enableBlur ? new BlurFilter({strength: 0, quality: 2}) : null;
        if (blurFilter) {
            sprite.filters = [blurFilter];
        }

        parent.addChild(sprite);
        return {sprite, glow, blurFilter, inUse: false};
    }

    const poolSize = Math.max(4, cfg.maxTrail + 2);
    for (let i = 0; i < poolSize; i++) {
        pool.push(makePooledEntry());
    }

    function acquire() {
        let e = pool.find((x) => !x.inUse);
        if (!e) {
            e = makePooledEntry();
            pool.push(e);
        }
        e.inUse = true;
        e.sprite.visible = true;
        return e;
    }

    function release(entry) {
        entry.inUse = false;
        entry.sprite.visible = false;
        const tex = entry.sprite.texture;
        if (tex && tex !== Texture.EMPTY) {
            tex.destroy(true);
            entry.sprite.texture = Texture.EMPTY;
        }
        if (entry.blurFilter) {
            entry.blurFilter.strength = 0;
        }
        entry.sprite.filters = entry.blurFilter ? [entry.blurFilter] : null;
        entry.sprite.scale.set(1);
        entry.sprite.rotation = 0;
        entry.sprite.alpha = 1;
        entry.sprite.tint = 0xffffff;
        if (entry.glow) {
            entry.glow.visible = true;
            entry.glow.alpha = glowCfg.alpha ?? 0.2;
        }
    }

    function captureTexture() {
        const hideList = getHiddenForSnapshot?.() ?? [];
        for (const o of hideList) {
            if (o) o.visible = false;
        }
        let tex = null;
        try {
            tex = renderer.generateTexture({
                target: playerRoot,
                resolution: Math.min(renderer.resolution || 1, 2),
                antialias: true,
                clearColor: [0, 0, 0, 0],
            });
        } finally {
            for (const o of hideList) {
                if (o) o.visible = true;
            }
        }
        return tex;
    }

    function spawnAt(worldX, worldY) {
        while (active.length >= cfg.maxTrail) {
            const old = active.shift();
            if (old) release(old);
        }

        const tex = captureTexture();
        if (!tex) return;

        const entry = acquire();
        const {sprite, glow, blurFilter} = entry;

        sprite.texture = tex;
        sprite.tint = cfg.tint;
        sprite.alpha = cfg.startOpacity;
        sprite.x = worldX;
        sprite.y = worldY;
        sprite.rotation = playerRoot.rotation;
        sprite.scale.copyFrom(playerRoot.scale);
        sprite.zIndex = worldY - 0.5;

        if (glow) {
            glow.tint = glowCfg.color ?? 0xffffff;
            glow.alpha = glowCfg.alpha ?? 0.2;
            glow.scale.set(glowCfg.scale ?? 1.05);
            glow.visible = glowCfg.enabled !== false;
        }

        active.push({
            entry,
            age: 0,
            sx: sprite.scale.x,
            sy: sprite.scale.y,
        });
    }

    /**
     * @param {number} dt
     * @param {number} worldX  Player container world X after movement/visuals
     * @param {number} worldY
     * @param {boolean} isDashing  Same-frame dash active flag from movement
     */
    function update(dt, worldX, worldY, isDashing) {
        if (isDashing) {
            spawnAcc += dt;
            while (spawnAcc >= cfg.spawnInterval) {
                spawnAcc -= cfg.spawnInterval;
                spawnAt(worldX, worldY);
            }
        } else {
            spawnAcc = 0;
        }

        const fade = cfg.fadeDuration;

        for (let i = active.length - 1; i >= 0; i--) {
            const inst = active[i];
            inst.age += dt;
            const t = Math.min(1, inst.age / fade);
            const {sprite, blurFilter, glow} = inst.entry;

            sprite.alpha = cfg.startOpacity * (1 - t);
            const es = cfg.scaleEnd;
            sprite.scale.set(inst.sx * (1 + (es - 1) * t), inst.sy * (1 + (es - 1) * t));

            if (blurFilter && cfg.enableBlur) {
                blurFilter.strength = cfg.blurEnd * t;
            }

            if (glow) {
                glow.alpha = (glowCfg.alpha ?? 0.2) * (1 - t * 0.85);
                const gs = (glowCfg.scale ?? 1.05) * (1 - t * 0.12);
                glow.scale.set(gs);
            }

            if (inst.age >= fade) {
                active.splice(i, 1);
                release(inst.entry);
            }
        }
    }

    function destroy() {
        for (const inst of active) {
            release(inst.entry);
        }
        active.length = 0;
        for (const e of pool) {
            if (e.sprite.parent) e.sprite.parent.removeChild(e.sprite);
            e.sprite.destroy({children: true});
        }
        pool.length = 0;
    }

    return {update, destroy, config: cfg};
}
