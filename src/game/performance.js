// performance.js
export class PerformanceMonitor {
    constructor() {
        this.fps = 0;
        this.frameTime = 0;
        this.lastTime = performance.now();
        this.frames = 0;
        this.updateInterval = 250; // Update display every 250ms
        this.lastUpdate = this.lastTime;

        // Create DOM element for display
        this.createDisplay();
    }

    createDisplay() {
        this.displayDiv = document.createElement('div');
        this.displayDiv.id = 'performance-monitor';
        this.displayDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: #0f0;
            font-family: monospace;
            font-size: 12px;
            padding: 5px 10px;
            border-radius: 5px;
            z-index: 1000;
            pointer-events: none;
            font-weight: bold;
        `;
        document.body.appendChild(this.displayDiv);
        this.updateDisplay();
    }

    update() {
        const now = performance.now();
        const delta = now - this.lastTime;

        this.frames++;

        // Update FPS counter at interval
        if (now - this.lastUpdate >= this.updateInterval) {
            this.fps = Math.round((this.frames * 1000) / (now - this.lastUpdate));
            this.frameTime = Math.round(delta);
            this.updateDisplay();
            this.frames = 0;
            this.lastUpdate = now;
        }

        this.lastTime = now;
        return delta;
    }

    updateDisplay() {
        let color = '#0f0'; // Green for good
        if (this.fps < 30) color = '#ff0'; // Yellow for warning
        if (this.fps < 20) color = '#f00'; // Red for bad

        this.displayDiv.innerHTML = `🎮 FPS: <span style="color: ${color}">${this.fps}</span> | 📊 Frame: ${this.frameTime}ms`;

        // Add entity count if available
        if (window.gameStats) {
            this.displayDiv.innerHTML += ` | 🧬 Entities: ${window.gameStats}`;
        }
    }

    setGameStats(stats) {
        window.gameStats = stats;
    }
}