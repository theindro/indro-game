// game/world/ChunkMonitor.js

import {useGameStore} from "../../stores/gameStore.js";

export class ChunkMonitor {
    constructor(openWorld) {
        this.openWorld = openWorld;

        this.createDisplay();

        this.lastUpdate = 0;
    }

    createDisplay() {
        this.display = document.createElement('div');

        this.display.style.position = 'fixed';
        this.display.style.bottom = '10px';
        this.display.style.left = '10px';

        this.display.style.width = '320px';

        this.display.style.background = 'rgba(0,0,0,0.75)';
        this.display.style.backdropFilter = 'blur(8px)';

        this.display.style.border =
            '1px solid rgba(255,255,255,0.08)';

        this.display.style.borderRadius = '10px';

        this.display.style.padding = '10px';

        this.display.style.color = '#ddd';

        this.display.style.fontFamily = 'monospace';
        this.display.style.fontSize = '12px';

        this.display.style.zIndex = '999999';

        this.display.style.pointerEvents = 'none';

        document.body.appendChild(this.display);
    }

    update(playerX, playerY) {

        const debugEnabled = useGameStore.getState().debug.enabled;

        if (!debugEnabled) {
            if (this.display) this.display.style.display = 'none';
            return;
        }

        if (this.display) this.display.style.display = 'block';

        const now = performance.now();

        if (now - this.lastUpdate < 150) return;

        this.lastUpdate = now;

        const ow = this.openWorld;

        const chunkSizeWorld =
            ow.chunkSize * ow.tileSize;

        const chunkX =
            Math.floor(playerX / chunkSizeWorld);

        const chunkZ =
            Math.floor(playerY / chunkSizeWorld);

        const key = `${chunkX},${chunkZ}`;

        const chunkData = ow.chunkData.get(key);

        const loadedChunks =
            ow.loadedChunks.size;

        const pendingChunks =
            ow.pendingChunks.size;

        const entities =
            ow.spawnedEntities.get(key);

        const mobCount =
            entities?.mobs?.length || 0;

        const activeMobs =
            ow.entitiesList?.mobs?.length || 0;

        const packCount =
            chunkData?.packs?.length || 0;

        const poi =
            chunkData?.poi?.type || 'none';

        const biome = chunkData?.biome || 'unknown';
        const weather = chunkData?.weather || 'unknown';
        const difficulty = chunkData?.difficulty || 'unknown';

        const type =
            chunkData?.type || 'unknown';

        this.display.innerHTML = `
            <div style="font-size:14px;font-weight:bold;margin-bottom:8px;">
                WORLD DEBUG
            </div>

            <div>Biome: ${biome}</div>
            <div>Name: ${chunkData?.landscapeProfile?.label}</div>
            <div>Weather: ${weather?.type}</div>
            
                       <hr style="border-color:rgba(255,255,255,0.08)" />
                        
            <div>Chunk: ${chunkX}, ${chunkZ}</div>
            <div>Type: ${type}</div>
            <div>Difficulty: ${difficulty}</div>
            <div>POI: ${poi}</div>

            <hr style="border-color:rgba(255,255,255,0.08)" />

            <div>Packs: ${packCount}</div>
            <div>Chunk Mobs: ${mobCount}</div>
            <div>Active Mobs: ${activeMobs}</div>

            <hr style="border-color:rgba(255,255,255,0.08)" />

            <div>Loaded Chunks: ${loadedChunks}</div>
            <div>Pending Chunks: ${pendingChunks}</div>

            <hr style="border-color:rgba(255,255,255,0.08)" />

            <div>World Seed: ${ow.worldSeed}</div>
        `;
    }

    destroy() {
        if (this.display?.parentNode) {
            this.display.parentNode.removeChild(this.display);
        }
    }
}