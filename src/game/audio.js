class AudioManager {
    constructor() {
        this.current = null;
        this.currentPath = null;

        // cache for sounds (important for performance)
        this.sounds = new Map();
    }

    play(path) {
        if (this.currentPath === path) return;

        if (this.current) {
            this.fadeOut(this.current);
        }

        const audio = new Audio(path);
        audio.loop = true;
        audio.volume = 0.3;
        audio.play();

        this.fadeIn(audio);

        this.current = audio;
        this.currentPath = path;
    }

    // 🔊 NEW: play one-shot sound
    playSFX(path, volume = 0.6) {
        let base = this.sounds.get(path);

        if (!base) {
            base = new Audio(path);
            base.volume = volume;
            this.sounds.set(path, base);
        }

        // clone so multiple hits can overlap
        const sound = base.cloneNode();
        sound.volume = volume;
        sound.play().catch(() => {});
    }

    fadeIn(audio) {
        let v = 0;
        const i = setInterval(() => {
            v += 0.02;
            if (v >= 0.2) {
                audio.volume = 0.2;
                clearInterval(i);
            } else {
                audio.volume = v;
            }
        }, 50);
    }

    fadeOut(audio) {
        let v = audio.volume;

        const i = setInterval(() => {
            v -= 0.03;
            if (v <= 0) {
                audio.pause();
                clearInterval(i);
            } else {
                audio.volume = v;
            }
        }, 50);
    }
}

export const audioManager = new AudioManager();