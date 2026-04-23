class AudioManager {
    constructor() {
        this.current = null;
        this.currentPath = null;
        this.sounds = new Map();
        this.lastPlayed = new Map();
        this.cooldowns = new Map();
        this.isMuted = false;  // Add this line
        this.musicVolume = 0.3; // Store original volume
    }

    // Add these methods to AudioManager
    toggleMute() {
        this.isMuted = !this.isMuted;

        if (this.current) {
            this.current.volume = this.isMuted ? 0 : this.musicVolume;
        }

        return this.isMuted;
    }

    setMuted(muted) {
        this.isMuted = muted;

        if (this.current) {
            this.current.volume = this.isMuted ? 0 : this.musicVolume;
        }
    }

    isMusicMuted() {
        return this.isMuted;
    }

    // Modify the existing play method to respect mute
    play(path) {
        if (this.currentPath === path && this.current) return;

        // Don't play if muted
        if (this.isMuted) {
            // Store the path but don't play audio
            this.currentPath = path;
            if (this.current) {
                this.fadeOut(this.current);
                this.current = null;
            }
            return;
        }

        if (this.current) {
            this.fadeOut(this.current);
        }

        const audio = new Audio(path);
        audio.loop = true;
        audio.volume = this.musicVolume;
        audio.play();

        this.fadeIn(audio);

        this.current = audio;
        this.currentPath = path;
    }

    // Add method to update music volume
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.current && !this.isMuted) {
            this.current.volume = this.musicVolume;
        }
    }

    // Set cooldown for specific sound
    setCooldown(path, ms = 500) {
        this.cooldowns.set(path, ms);
    }


    // 🔊 NEW: play one-shot sound with cooldown
    playSFX(path, volume = 0.6) {
        // Check cooldown for this sound
        const lastTime = this.lastPlayed.get(path) || 0;
        const cooldown = this.cooldowns.get(path) || 500; // Default 500ms
        const now = Date.now();

        if (now - lastTime < cooldown) {
            return; // Still on cooldown - don't play
        }

        // Update last played time
        this.lastPlayed.set(path, now);

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

    // Convenience method for chain sounds (shorter cooldown)
    playChainSound(volume = 0.4) {
        const path = '/sounds/chain.ogg';
        const lastTime = this.lastPlayed.get('chain') || 0;
        const now = Date.now();

        // 200ms cooldown for chain sounds (faster but still not spam)
        if (now - lastTime < 200) {
            return;
        }

        this.lastPlayed.set('chain', now);
        this.playSFX(path, volume);
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

// Set default cooldowns for common sounds
audioManager.setCooldown('/sounds/hit-splat.ogg', 50);
audioManager.setCooldown('/sounds/chain.ogg', 500);
audioManager.setCooldown('/sounds/shoot.ogg', 200);
audioManager.setCooldown('/sounds/pickup.ogg', 150);