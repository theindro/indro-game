// ui/WorldHud.js
import { Container, Text } from 'pixi.js';

export class WorldHud {
    constructor(app) {
        this.container = new Container();
        app.stage.addChild(this.container);

        this.text = new Text({
            text: '',
            style: {
                fill: 0xffffff,
                fontSize: 14,
                fontFamily: 'monospace',
                backgroundColor: 0x000000,
                backgroundAlpha: 0.5,
                padding: 8
            }
        });

        // Set anchor to top-left (0,0) for proper positioning
        this.text.anchor.set(0, 0);

        // Position in top-left corner with some padding
        this.text.x = 10;
        this.text.y = 10;

        this.container.addChild(this.text);

        this.currentData = null;
    }

    update(data) {
        if (!data) return;

        // Clean up the text formatting
        const text =
            `Biome: ${data.biome || 'unknown'}
Chunk: ${data.chunkX}, ${data.chunkZ}
POI: ${data.poi || 'none'}
Mobs: ${data.mobCount || 0}
Props: ${data.propCount || 0}`;

        this.text.text = text;
    }

    resize(app) {
        // Keep it in top-left corner, just update if needed
        this.text.x = 10;
        this.text.y = 10;
    }
}