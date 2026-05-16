/**
 * Weather preset definitions: ambient tint, shadows, and particle effects.
 * Use setWeatherPreset(id) on CreateWeatherController.
 */

export const WEATHER_PRESETS = {
    clear: {
        label: 'Clear',
        particles: { type: 'none' },
        ambient: { color: 0xfff5e8, alpha: 0.04 },
        shadow: { x: -28, y: 12, skew: -0.22, alpha: 0.16 },
    },

    forest_day: {
        label: 'Forest · Day',
        particles: { type: 'pollen', intensity: 0.4, speed: 0.55 },
        ambient: { color: 0xe8f4ff, alpha: 0.08 },
        shadow: { x: -32, y: 14, skew: -0.24, alpha: 0.2 },
    },

    forest_sunset: {
        label: 'Forest · Sunset',
        particles: { type: 'pollen', intensity: 0.3, speed: 0.35, warm: true },
        ambient: { color: 0xff5c28, alpha: 0.24 },
        shadow: { x: -38, y: 9, skew: -0.16, alpha: 0.11 },
    },

    forest_night: {
        label: 'Forest · Night',
        particles: { type: 'fireflies', intensity: 0.9, speed: 1 },
        ambient: { color: 0x0c1830, alpha: 0.52 },
        shadow: { x: -12, y: 5, skew: -0.08, alpha: 0.42 },
    },

    forest_rain: {
        label: 'Forest · Rain',
        particles: { type: 'rain', intensity: 0.9, speed: 1.15, wind: 0.35 },
        ambient: { color: 0x142030, alpha: 0.4 },
        shadow: { x: -22, y: 16, skew: -0.28, alpha: 0.07 },
    },

    forest_fog: {
        label: 'Forest · Mist',
        particles: { type: 'mist', intensity: 0.7, speed: 0.5 },
        ambient: { color: 0x8aa8c8, alpha: 0.28 },
        shadow: { x: -20, y: 10, skew: -0.18, alpha: 0.1 },
    },

    desert_day: {
        label: 'Desert · Day',
        particles: { type: 'heat', intensity: 0.45, speed: 0.7 },
        ambient: { color: 0xffe8b0, alpha: 0.12 },
        shadow: { x: -40, y: 8, skew: -0.12, alpha: 0.14 },
    },

    desert_sandstorm: {
        label: 'Desert · Sandstorm',
        particles: { type: 'sandstorm', intensity: 0.85, speed: 1.2 },
        ambient: { color: 0x6b3a12, alpha: 0.42 },
        shadow: { x: -18, y: 6, skew: -0.1, alpha: 0.06 },
    },

    ice_day: {
        label: 'Ice · Overcast',
        particles: { type: 'snow', intensity: 0.55, speed: 0.75 },
        ambient: { color: 0xb8d4f0, alpha: 0.18 },
        shadow: { x: -24, y: 11, skew: -0.2, alpha: 0.22 },
    },

    ice_blizzard: {
        label: 'Ice · Blizzard',
        particles: { type: 'snow', intensity: 1.0, speed: 1.4 },
        ambient: { color: 0x6a88b0, alpha: 0.32 },
        shadow: { x: -16, y: 8, skew: -0.14, alpha: 0.28 },
    },

    lava_day: {
        label: 'Lava · Smoky',
        particles: { type: 'embers', intensity: 0.5, speed: 0.8 },
        ambient: { color: 0x2a1810, alpha: 0.22 },
        shadow: { x: -25, y: 10, skew: -0.2, alpha: 0.2 },
    },

    lava_intense: {
        label: 'Lava · Embers',
        particles: { type: 'embers', intensity: 1.0, speed: 1.1 },
        ambient: { color: 0x1a0808, alpha: 0.45 },
        shadow: { x: -20, y: 8, skew: -0.15, alpha: 0.12 },
    },

    // Legacy single-effect ids (for quick dev / compat)
    rain: {
        label: 'Rain',
        particles: { type: 'rain', intensity: 0.85, speed: 1, wind: 0.3 },
        ambient: { color: 0x142030, alpha: 0.38 },
        shadow: { x: -22, y: 14, skew: -0.25, alpha: 0.08 },
    },
    snow: {
        label: 'Snow',
        particles: { type: 'snow', intensity: 0.7, speed: 0.9 },
        ambient: { color: 0x8ab0d8, alpha: 0.2 },
        shadow: { x: -24, y: 11, skew: -0.2, alpha: 0.24 },
    },
    embers: {
        label: 'Embers',
        particles: { type: 'embers', intensity: 0.9, speed: 1 },
        ambient: { color: 0x1a0808, alpha: 0.42 },
        shadow: { x: -20, y: 8, skew: -0.15, alpha: 0.14 },
    },
    sandstorm: {
        label: 'Sandstorm',
        particles: { type: 'sandstorm', intensity: 0.85, speed: 1.1 },
        ambient: { color: 0x6b3a12, alpha: 0.4 },
        shadow: { x: -18, y: 6, skew: -0.1, alpha: 0.06 },
    },
    fog: {
        label: 'Fog',
        particles: { type: 'mist', intensity: 0.75, speed: 0.45 },
        ambient: { color: 0x9ab0d0, alpha: 0.32 },
        shadow: { x: -20, y: 10, skew: -0.18, alpha: 0.09 },
    },
};

/** Per-biome rotating presets (game time). */
export const BIOME_WEATHER_CYCLES = {
    forest: [
        { preset: 'forest_day', duration: 100 },
        { preset: 'forest_sunset', duration: 45 },
        { preset: 'forest_night', duration: 75 },
        { preset: 'forest_rain', duration: 55 },
        { preset: 'forest_day', duration: 40 },
    ],
    desert: [
        { preset: 'desert_day', duration: 110 },
        { preset: 'desert_sandstorm', duration: 40 },
        { preset: 'desert_day', duration: 70 },
    ],
    ice: [
        { preset: 'ice_day', duration: 90 },
        { preset: 'ice_blizzard', duration: 50 },
        { preset: 'ice_day', duration: 80 },
    ],
    lava: [
        { preset: 'lava_day', duration: 80 },
        { preset: 'lava_intense', duration: 45 },
        { preset: 'lava_day', duration: 60 },
    ],
};

/** Default preset when entering a biome (before cycle advances). */
export const BIOME_DEFAULT_PRESET = {
    forest: 'forest_day',
    desert: 'desert_day',
    ice: 'ice_day',
    lava: 'lava_day',
};

export function getWeatherPresetList() {
    return Object.entries(WEATHER_PRESETS).map(([id, p]) => ({
        id,
        label: p.label ?? id,
    }));
}
