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
                fontSize: 18,
                fontFamily: 'Arial'
            }
        });

        this.text.anchor.set(0.5, 0);
        this.text.x = 10;
        this.text.y = 10;

        this.container.addChild(this.text);

        this.currentData = null;
    }

    update(data) {
        console.log('here');
        console.log(data);
        if (!data) return;


        const text =
                `Biome: ${data.biome}
                Chunk: ${data.chunkX}, ${data.chunkZ}
                POI: ${data.poi || 'none'}
                Mobs: ${data.mobCount}
                Props: ${data.propCount}`;

        this.text.text = text;
    }

    resize(app) {
        this.text.x = app.screen.width / 2;
    }
}