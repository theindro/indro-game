// game/PerformanceMonitor.js
export class PerformanceMonitor {
    constructor() {
        this.fps = 60;
        this.frameTime = 0;
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.mobCount = 0;
        this.drawCalls = 0;

        // Create FPS display
        this.createDisplay();
    }

    createDisplay() {
        this.display = document.createElement('div');
        this.display.style.position = 'fixed';
        this.display.style.bottom = '10px';
        this.display.style.left = '10px';
        this.display.style.backgroundColor = 'rgba(0,0,0,0.7)';
        this.display.style.color = '#0f0';
        this.display.style.fontFamily = 'monospace';
        this.display.style.fontSize = '12px';
        this.display.style.padding = '5px';
        this.display.style.borderRadius = '5px';
        this.display.style.zIndex = '9999';
        this.display.style.pointerEvents = 'none';
        document.body.appendChild(this.display);
    }

    update(mobCount) {
        this.frameCount++;
        const now = performance.now();
        const delta = now - this.lastTime;

        if (delta >= 1000) {
            this.fps = this.frameCount;
            this.frameTime = delta / this.frameCount;
            this.frameCount = 0;
            this.lastTime = now;
            this.mobCount = mobCount;

            this.display.innerHTML = `
                FPS: ${this.fps} | Frame: ${this.frameTime.toFixed(2)}ms<br>
                Mobs: ${this.mobCount} | Draw: ${this.drawCalls}
            `;
        }
    }

    setDrawCalls(count) {
        this.drawCalls = count;
    }
}