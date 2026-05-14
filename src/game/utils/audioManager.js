// audio files: https://pixabay.com/sound-effects/search/vfx%20rpg%20game%20sounds%20arrow%20shoot/?pagi=8
// audioManager.js - Simplified AudioManager
export class AudioManager {
    constructor() {
        this.current = null;
        this.currentPath = null;
        this.sounds = new Map();
        this.lastPlayed = new Map();
        this.cooldowns = new Map();
        this.isMuted = false;
        this.musicVolume = 0.1;
        this.sfxVolume = 0.5;


        this.unlocked = false;

        this.unlockAudio = this.unlockAudio.bind(this);

        window.addEventListener('pointerdown', this.unlockAudio, { once: true });
        window.addEventListener('keydown', this.unlockAudio, { once: true });
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

    unlockAudio() {
        if (this.unlocked) return;

        const audio = new Audio('/sounds/bgnoise.mp3');

        audio.volume = 0;
        audio.loop = true;

        audio.play()
            .then(() => {
                console.log('Audio unlocked');

                this.unlocked = true;

                this.current = audio;
                this.currentPath = '/sounds/bgnoise.mp3';

                // fade in
                audio.volume = this.musicVolume;
            })
            .catch(err => {
                console.warn('Audio unlock failed:', err);
            });
    }

    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }

    play(path) {
        if (this.currentPath === path && this.current) return;

        if (this.current) {
            this.current.pause();
        }

        const audio = new Audio(path);

        audio.loop = true;
        audio.preload = 'auto';
        audio.volume = this.isMuted ? 0 : this.musicVolume;

        audio.play().catch((err) => {
            console.warn("Audio blocked:", err);
        });

        this.current = audio;
        this.currentPath = path;
    }

    playSpatialSFX(path, soundX, soundY, playerX, playerY) {
        if (this.isMuted) return;

        const dx = soundX - playerX;
        const dy = soundY - playerY;

        const distance = Math.sqrt(dx * dx + dy * dy);

        const maxDistance = 2000;

        if (distance > maxDistance) return;

        // Volume falloff
        const volume = Math.max(0, 1 - distance / maxDistance);

        // Stereo pan (-1 left, +1 right)
        const pan = Math.max(-1, Math.min(1, dx / maxDistance));

        const audio = new Audio(path);

        audio.volume = volume * this.sfxVolume;

        // Stereo panning
        const ctx = this.audioContext || new AudioContext();
        this.audioContext = ctx;

        const source = ctx.createMediaElementSource(audio);

        const panner = new StereoPannerNode(ctx, {
            pan
        });

        source.connect(panner);
        panner.connect(ctx.destination);

        audio.play();
    }

    setCooldown(path, ms = 500) {
        this.cooldowns.set(path, ms);
    }

    playSFX(path, volume = null) {
        if (this.isMuted) return;

        const now = Date.now();
        const lastTime = this.lastPlayed.get(path) || 0;
        const cooldown = this.cooldowns.get(path) || 200;

        if (now - lastTime < cooldown) return;

        this.lastPlayed.set(path, now);

        // Determine the final volume for this sound
        let finalVolume = this.sfxVolume;

        if (volume !== null && volume >= 0) {
            finalVolume = Math.min(this.sfxVolume, volume); // Use lower volume if provided
        }

        // Get or create base Audio
        let base = this.sounds.get(path);
        if (!base) {
            base = new Audio(path);
            this.sounds.set(path, base);
        }

        // Clone and play with correct volume
        const sound = base.cloneNode();
        sound.volume = finalVolume;
        sound.play().catch(err => {
            console.warn(`Failed to play SFX ${path}:`, err);
        });
    }
}

export const audioManager = new AudioManager();