/**
 * Totem wave world event: channel totem → 60s of spawns → clear all → reward chest.
 */

import { VFX } from '../../GlobalEffects.js';
import { getChunkDifficulty } from '../../difficultyScaling.js';
import { getRemainingMobBudget } from '../mobSpawnLimits.js';
import { resolveVsColliders } from '../collision.js';
import { MOB_RADIUS } from '../../constants.js';
import { useGameStore } from '../../../stores/gameStore.js';
import { buildTotemWaveTemporaryQuest } from '../../quests/temporaryEventQuests.js';

export const TOTEM_EVENT_DURATION_SEC = 60;
const WAVE_INTERVAL_SEC = 7;
const MOBS_PER_WAVE_MIN = 3;
const MOBS_PER_WAVE_MAX = 5;
const SPAWN_RADIUS_MIN = 110;
const SPAWN_RADIUS_MAX = 220;
const MAX_EVENT_MOBS_ALIVE = 22;
const MAX_TOTAL_EVENT_SPAWNS = 48;

/**
 * @param {import('../OpenWorldManager.js').OpenWorldManager} openWorld
 */
export class TotemWaveEventManager {
    constructor(openWorld) {
        this.openWorld = openWorld;
        /** @type {import('./totemWaveEvent.js').TotemWaveState | null} */
        this.active = null;
        this._statusFloatTimer = 0;
    }

    isActive() {
        return this.active != null && this.active.phase !== 'done';
    }

    /**
     * @param {object} totemProp Interactable prop instance from InteractablePropManager
     * @returns {boolean}
     */
    tryStart(totemProp) {
        if (this.isActive()) {
            VFX.addFloat('Event already in progress!', totemProp.x, totemProp.z - 50, '#ffaa44');
            return false;
        }

        const chunkSizeWorld = this.openWorld.chunkSize * this.openWorld.tileSize;
        const chunkX = Math.floor(totemProp.x / chunkSizeWorld);
        const chunkZ = Math.floor(totemProp.z / chunkSizeWorld);
        const chunkData = this.openWorld.chunkData.get(`${chunkX},${chunkZ}`);
        const biome = chunkData?.biome ?? 'forest';
        const difficulty = chunkData?.difficulty ?? getChunkDifficulty(chunkX, chunkZ);

        this.active = {
            id: totemProp.id,
            phase: 'spawning',
            x: totemProp.x,
            z: totemProp.z,
            chunkKey: totemProp.chunkKey,
            biome,
            difficulty,
            elapsed: 0,
            waveTimer: 0,
            totalSpawned: 0,
            alive: new Set(),
            chestSpawned: false,
            totemProp,
        };

        this._dimTotem(totemProp);
        VFX.addFloat('WAVE EVENT!', totemProp.x, totemProp.z - 70, '#ff6622');
        VFX.addFloat('Survive 60s — slay all foes!', totemProp.x, totemProp.z - 95, '#ffcc88');

        this._spawnWave();
        this._syncTemporaryQuest();
        return true;
    }

    cancel() {
        if (!this.active) return;
        for (const mob of this.active.alive) {
            const idx = this.openWorld.entitiesList?.mobs?.indexOf(mob);
            if (idx > -1) this.openWorld.entitiesList.mobs.splice(idx, 1);
            this.openWorld.worldObjects.destroyMob(mob);
        }
        this.active = null;
        this._clearTemporaryQuest();
    }

    /**
     * @param {number} dt
     */
    update(dt) {
        const ev = this.active;
        if (!ev || ev.phase === 'done') return;

        ev.elapsed += dt;
        ev.waveTimer += dt;

        this._pruneDeadMobs(ev);

        if (ev.phase === 'spawning') {
            if (ev.waveTimer >= WAVE_INTERVAL_SEC) {
                ev.waveTimer = 0;
                this._spawnWave();
            }

            if (ev.elapsed >= TOTEM_EVENT_DURATION_SEC) {
                ev.phase = 'clearing';
                ev._clearingInitial = Math.max(ev.alive.size, 1);
                VFX.addFloat(
                    'No more spawns — clear the rest!',
                    ev.x,
                    ev.z - 60,
                    '#88ccff'
                );
            }
        }

        if (ev.phase === 'clearing' && ev.alive.size === 0 && !ev.chestSpawned) {
            this._spawnRewardChest(ev);
            ev.phase = 'done';
            ev.chestSpawned = true;
            VFX.addFloat('Reward chest appeared!', ev.x, ev.z - 55, '#44ff88');
            this.active = null;
            this._clearTemporaryQuest();
            return;
        }

        this._syncTemporaryQuest();

        this._statusFloatTimer += dt;
        if (this._statusFloatTimer >= 12) {
            this._statusFloatTimer = 0;
            if (ev.phase === 'spawning') {
                const left = Math.max(0, Math.ceil(TOTEM_EVENT_DURATION_SEC - ev.elapsed));
                VFX.addFloat(
                    `Wave ${left}s · ${ev.alive.size} alive`,
                    ev.x,
                    ev.z - 120,
                    '#ffffff'
                );
            } else if (ev.phase === 'clearing') {
                VFX.addFloat(
                    `Clear ${ev.alive.size} remaining`,
                    ev.x,
                    ev.z - 120,
                    '#ffdd66'
                );
            }
        }
    }

    /**
     * Call when a mob is removed from the world (death).
     * @param {object} mob
     */
    onMobRemoved(mob) {
        const ev = this.active;
        if (!ev || !mob?.totemWaveEventId) return;
        if (mob.totemWaveEventId !== ev.id) return;
        ev.alive.delete(mob);
    }

    _syncTemporaryQuest() {
        const ev = this.active;
        if (!ev || ev.phase === 'done') {
            this._clearTemporaryQuest();
            return;
        }
        const payload = buildTotemWaveTemporaryQuest(
            ev.phase,
            ev,
            TOTEM_EVENT_DURATION_SEC
        );
        useGameStore.getState().setTemporaryEventQuest(payload);
    }

    _clearTemporaryQuest() {
        useGameStore.getState().setTemporaryEventQuest(null);
    }

    _dimTotem(prop) {
        if (prop.container) {
            prop.container.alpha = 0.45;
            if (prop.glowGraphic) prop.glowGraphic.alpha = 0.15;
        }
        if (prop.collider) prop.collider.collision = false;
        prop._eventConsumed = true;
    }

    _pruneDeadMobs(ev) {
        for (const mob of [...ev.alive]) {
            if (!mob?.c || mob.hp <= 0) {
                ev.alive.delete(mob);
            }
        }
    }

    _spawnWave() {
        const ev = this.active;
        if (!ev || ev.phase !== 'spawning') return;
        if (ev.elapsed >= TOTEM_EVENT_DURATION_SEC) return;
        if (ev.totalSpawned >= MAX_TOTAL_EVENT_SPAWNS) return;
        if (ev.alive.size >= MAX_EVENT_MOBS_ALIVE) return;

        const globalBudget = getRemainingMobBudget(this.openWorld.entitiesList.mobs.length);
        if (globalBudget <= 0) return;

        const count = Math.min(
            MOBS_PER_WAVE_MIN + Math.floor(Math.random() * (MOBS_PER_WAVE_MAX - MOBS_PER_WAVE_MIN + 1)),
            MAX_EVENT_MOBS_ALIVE - ev.alive.size,
            MAX_TOTAL_EVENT_SPAWNS - ev.totalSpawned,
            globalBudget
        );

        const colliders = this.openWorld.colliders;

        for (let i = 0; i < count; i++) {
            const pos = this._pickSpawnPosition(ev, i);
            if (!pos) continue;

            const mob = this.openWorld.worldObjects.spawnMob(
                pos.x,
                pos.y,
                ev.biome,
                '',
                ev.difficulty,
                (ev.id.charCodeAt(0) ^ i * 7919) | 0
            );

            if (!mob) continue;

            mob.totemWaveEventId = ev.id;
            mob.spawnChunk = ev.chunkKey;

            this.openWorld.entitiesList.mobs.push(mob);
            ev.alive.add(mob);
            ev.totalSpawned++;
        }
    }

    _pickSpawnPosition(ev, attemptIndex) {
        const colliders = this.openWorld.colliders;
        const seed = (attemptIndex * 19349663) ^ (ev.totalSpawned * 424242);

        for (let t = 0; t < 12; t++) {
            const angle = ((seed + t * 17) % 360) * (Math.PI / 180);
            const dist =
                SPAWN_RADIUS_MIN +
                (((seed + t * 31) % 1000) / 1000) * (SPAWN_RADIUS_MAX - SPAWN_RADIUS_MIN);

            let x = ev.x + Math.cos(angle) * dist;
            let y = ev.z + Math.sin(angle) * dist;

            const resolved = resolveVsColliders(x, y, MOB_RADIUS, colliders);
            x = resolved.x;
            y = resolved.y;

            let blocked = false;
            for (const mob of ev.alive) {
                if (Math.hypot(mob.x - x, mob.y - y) < MOB_RADIUS * 2.5) {
                    blocked = true;
                    break;
                }
            }
            if (blocked) continue;

            if (Math.hypot(x - ev.x, y - ev.z) < SPAWN_RADIUS_MIN * 0.65) continue;

            return { x, y };
        }

        return null;
    }

    _spawnRewardChest(ev) {
        const chestId = 'totem_wave_chest';
        const offsetX = 40;
        const chest = this.openWorld.interactablePropManager.spawnManualProp(
            chestId,
            ev.x + offsetX,
            ev.z,
            1.1,
            ev.chunkKey
        );

        if (chest && ev.difficulty) {
            const lootMul = this.openWorld.chunkData.get(ev.chunkKey)?.contentScales?.lootMultiplier ?? 1;
            chest._lootMul = lootMul;
        }
    }
}
