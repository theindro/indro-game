/** Default ability templates (no store imports — safe for layout/skill modules). */

export const INITIAL_ABILITIES = {
    ability1: {
        name: 'Arrow Barrage',
        icon: '/icons/ability1.png',
        cooldownEnd: 0,
        maxCooldown: 5,
        level: 1,
        description: 'Shoots 10 arrows in cone front of player',
        arrowCount: 10,
        arrowSpread: 0.15,
        damageMultiplier: 3,
    },
    ability2: {
        name: 'Rapid Fire',
        icon: '/icons/ability2.png',
        cooldownEnd: 0,
        maxCooldown: 2,
        level: 1,
        description: 'Rapidly fires 10 arrows at the nearest enemy',
        arrowCount: 6,
        damageMultiplier: 0.6,
        fireDelay: 0.1,
    },
    ability3: {
        name: 'Empower',
        icon: '/icons/ability3.png',
        cooldownEnd: 0,
        maxCooldown: 15,
        level: 1,
        buffDuration: 6,
        description: '6s: fire aura — your arrows ignite enemies (burn)',
    },
    ability4: {
        name: 'Frost Arrow',
        icon: '/icons/ability4.png',
        cooldownEnd: 0,
        maxCooldown: 10,
        level: 1,
        description: 'Launches a massive frost arrow that explodes and freezes enemies',
        damageMultiplier: 2.5,
        explosionRadius: 180,
        freezeDuration: 3,
        slowAmount: 0.6,
        arrowCount: 1,
        projectileSpeed: 8,
    },
    ability5: {
        name: 'Venom Nova',
        icon: '/icons/ability6.png',
        cooldownEnd: 0,
        maxCooldown: 12,
        level: 1,
        description: 'Poison explosion at target location',
        explosionRadius: 140,
        poisonDamage: 3,
        poisonDuration: 5,
        damageMultiplier: 1.2,
    },
    ability6: {
        name: 'Spinshot',
        icon: '/icons/ability1.png',
        cooldownEnd: 0,
        maxCooldown: 44,
        level: 1,
        description: 'Spin and fire arrows in all directions for 2s. Uses chain & pierce.',
        spinDuration: 2,
        fireInterval: 0.09,
        arrowsPerWave: 6,
        rotationSpeed: 3.2,
        damageMultiplier: 0.5,
    },
    ability7: {
        name: 'Fire Slam',
        icon: '/icons/ability5.png',
        cooldownEnd: 0,
        maxCooldown: 14,
        level: 1,
        description: 'Teleport to cursor and slam down, unleashing a fire shockwave that damages, stuns, and burns nearby enemies.',
        leapRange: 420,
        explosionRadius: 140,
        stunDuration: 2,
        burnDuration: 3,
        burnTickDamage: 3,
        damageMultiplier: 1.45,
    },
};

/** All learnable ability ids (cooldown state keys). */
export const ALL_ABILITY_KEYS = Object.freeze(
    /** @type {const} */ (Object.keys(INITIAL_ABILITIES))
);

export function cloneDefaultAbilities() {
    return /** @type {typeof INITIAL_ABILITIES} */ (JSON.parse(JSON.stringify(INITIAL_ABILITIES)));
}
