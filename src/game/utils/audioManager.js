// audioManager.js - Simplified AudioManager
export class AudioManager {
    constructor() {
        this.current = null;
        this.currentPath = null;
        this.sounds = new Map();
        this.lastPlayed = new Map();
        this.cooldowns = new Map();
        this.isMuted = false;
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;
    }

    setMuted(muted) {
        this.isMuted = muted;
        if (this.current) {
            this.current.volume = this.isMuted ? 0 : this.musicVolume;
        }
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.current && !this.isMuted) {
            this.current.volume = this.musicVolume;
        }
    }

    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }

    play(path) {
        if (this.currentPath === path && this.current) return;

        if (this.current) {
            this.current.pause();
            this.current = null;
        }

        if (this.isMuted) {
            this.currentPath = path;
            return;
        }

        const audio = new Audio(path);
        audio.loop = true;
        audio.volume = this.musicVolume;
        audio.play().catch(() => {});

        this.current = audio;
        this.currentPath = path;
    }

    setCooldown(path, ms = 500) {
        this.cooldowns.set(path, ms);
    }

    playSFX(path, volume = null) {
        if (this.isMuted) return;

        const now = Date.now();
        const lastTime = this.lastPlayed.get(path) || 0;
        const cooldown = this.cooldowns.get(path) || 500;

        if (now - lastTime < cooldown) return;

        this.lastPlayed.set(path, now);

        let base = this.sounds.get(path);
        if (!base) {
            base = new Audio(path);
            base.volume = this.sfxVolume;
            this.sounds.set(path, base);
        }

        const sound = base.cloneNode();
        sound.volume = this.sfxVolume;
        sound.play().catch(() => {});
    }
}

export const audioManager = new AudioManager();