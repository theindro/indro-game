// world/textureAnalyzer.js
import { Graphics } from 'pixi.js';

// Caches
const textureAnalysisCache = new Map();
const colliderCache = new Map();

// Configuration for collision accuracy
const COLLISION_CONFIG = {
    // Number of circles to use (1-8)
    // 1 = single circle (fast, less accurate)
    // 4-8 = multiple circles (slower, more accurate)
    circleCount: 50,  // Change this to control accuracy

    // Alpha threshold (lower = more sensitive to semi-transparent pixels)
    alphaThreshold: 10,

    // Margin multiplier (smaller = tighter collision)
    margin: 1,

    // Minimum pixels required for a quadrant to get its own circle
    minPixelsPerQuadrant: 50
};

/**
 * Set collision accuracy
 * @param {number} circles - Number of circles (1-8)
 * @param {number} margin - Collision margin (0.5-1.0, lower = tighter)
 */
export function setCollisionAccuracy(circles = 4, margin = 0.85) {
    COLLISION_CONFIG.circleCount = Math.min(8, Math.max(1, circles));
    COLLISION_CONFIG.margin = margin;
    // Clear cache to regenerate colliders with new settings
    colliderCache.clear();
    console.log(`Collision accuracy set to ${COLLISION_CONFIG.circleCount} circles with margin ${COLLISION_CONFIG.margin}`);
}

/**
 * Analyze texture to find visible pixel boundaries (ignoring transparent areas)
 */
export async function analyzeTexture(texture) {
    if (!texture) return getDefaultBounds(64, 64);

    // Check cache
    if (textureAnalysisCache.has(texture)) {
        return textureAnalysisCache.get(texture);
    }

    try {
        // Get the source image from texture
        let img = null;

        if (texture.baseTexture?.resource?.source) {
            img = texture.baseTexture.resource.source;
        } else if (texture.source?.resource) {
            img = texture.source.resource;
        } else if (texture._source) {
            img = texture._source;
        }

        if (!img || !img.width || !img.height) {
            return getDefaultBounds(texture.width || 64, texture.height || 64);
        }

        // Draw image to canvas for pixel analysis
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Store all visible pixel coordinates
        const visiblePixels = [];
        let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

        // Find all visible pixels
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const alpha = data[(y * canvas.width + x) * 4 + 3];
                if (alpha > COLLISION_CONFIG.alphaThreshold) {
                    visiblePixels.push({ x, y });
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        if (visiblePixels.length === 0) {
            return getDefaultBounds(canvas.width, canvas.height);
        }

        // Calculate bounds
        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // Calculate center of mass
        let sumX = 0, sumY = 0;
        for (const p of visiblePixels) {
            sumX += p.x;
            sumY += p.y;
        }
        const centerOfMassX = sumX / visiblePixels.length;
        const centerOfMassY = sumY / visiblePixels.length;

        // Calculate max radius from center
        let maxRadius = 0;
        for (const p of visiblePixels) {
            const dx = p.x - centerX;
            const dy = p.y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            maxRadius = Math.max(maxRadius, dist);
        }

        // Generate collision circles based on configured accuracy
        const collisionCircles = generateCollisionCirclesFromPixels(
            visiblePixels, centerX, centerY, minX, minY, maxX, maxY, canvas.width, canvas.height
        );

        const result = {
            width, height,
            minX, minY, maxX, maxY,
            centerX, centerY,
            centerOfMassX, centerOfMassY,
            maxRadius,
            boundingCircleRadius: maxRadius,
            pixelCount: visiblePixels.length,
            visiblePercent: (visiblePixels.length / (canvas.width * canvas.height)) * 100,
            originalWidth: canvas.width,
            originalHeight: canvas.height,
            collisionCircles,
            visiblePixels
        };

        textureAnalysisCache.set(texture, result);
        return result;

    } catch (err) {
        console.error('Failed to analyze texture:', err);
        return getDefaultBounds(texture.width || 64, texture.height || 64);
    }
}

/**
 * Generate collision circles based on configured accuracy
 */
function generateCollisionCirclesFromPixels(visiblePixels, centerX, centerY, minX, minY, maxX, maxY, imgWidth, imgHeight) {
    const circles = [];
    const targetCircles = COLLISION_CONFIG.circleCount;

    // For single circle mode
    if (targetCircles === 1) {
        circles.push({
            centerX, centerY,
            radius: Math.sqrt(((maxX - minX) / 2) ** 2 + ((maxY - minY) / 2) ** 2)
        });
        return circles;
    }

    // For 2 circles mode (horizontal split)
    if (targetCircles === 2) {
        const leftPixels = visiblePixels.filter(p => p.x < centerX);
        const rightPixels = visiblePixels.filter(p => p.x >= centerX);

        if (leftPixels.length > COLLISION_CONFIG.minPixelsPerQuadrant) {
            let sumLX = 0, sumLY = 0;
            for (const p of leftPixels) {
                sumLX += p.x;
                sumLY += p.y;
            }
            circles.push({
                centerX: sumLX / leftPixels.length,
                centerY: sumLY / leftPixels.length,
                radius: calculateRadiusForPixels(leftPixels)
            });
        }

        if (rightPixels.length > COLLISION_CONFIG.minPixelsPerQuadrant) {
            let sumRX = 0, sumRY = 0;
            for (const p of rightPixels) {
                sumRX += p.x;
                sumRY += p.y;
            }
            circles.push({
                centerX: sumRX / rightPixels.length,
                centerY: sumRY / rightPixels.length,
                radius: calculateRadiusForPixels(rightPixels)
            });
        }

        if (circles.length === 0) {
            circles.push({
                centerX, centerY,
                radius: Math.sqrt(((maxX - minX) / 2) ** 2 + ((maxY - minY) / 2) ** 2)
            });
        }
        return circles;
    }

    // For 4 circles mode (quadrants) - DEFAULT
    if (targetCircles <= 4) {
        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;

        const quadrants = [
            { xRange: [minX, midX], yRange: [minY, midY] },  // top-left
            { xRange: [midX, maxX], yRange: [minY, midY] },  // top-right
            { xRange: [minX, midX], yRange: [midY, maxY] },  // bottom-left
            { xRange: [midX, maxX], yRange: [midY, maxY] }   // bottom-right
        ];

        for (const quad of quadrants) {
            const quadrantPixels = visiblePixels.filter(p =>
                p.x >= quad.xRange[0] && p.x <= quad.xRange[1] &&
                p.y >= quad.yRange[0] && p.y <= quad.yRange[1]
            );

            if (quadrantPixels.length > COLLISION_CONFIG.minPixelsPerQuadrant) {
                let sumQX = 0, sumQY = 0;
                for (const p of quadrantPixels) {
                    sumQX += p.x;
                    sumQY += p.y;
                }
                circles.push({
                    centerX: sumQX / quadrantPixels.length,
                    centerY: sumQY / quadrantPixels.length,
                    radius: calculateRadiusForPixels(quadrantPixels) * 0.85
                });
            }
        }
    }

    // For 6-8 circles mode (more granular)
    if (targetCircles >= 6) {
        // Divide into 3x3 grid
        const stepX = (maxX - minX) / 3;
        const stepY = (maxY - minY) / 3;

        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const cellMinX = minX + i * stepX;
                const cellMaxX = minX + (i + 1) * stepX;
                const cellMinY = minY + j * stepY;
                const cellMaxY = minY + (j + 1) * stepY;

                const cellPixels = visiblePixels.filter(p =>
                    p.x >= cellMinX && p.x <= cellMaxX &&
                    p.y >= cellMinY && p.y <= cellMaxY
                );

                if (cellPixels.length > COLLISION_CONFIG.minPixelsPerQuadrant && circles.length < targetCircles) {
                    let sumCX = 0, sumCY = 0;
                    for (const p of cellPixels) {
                        sumCX += p.x;
                        sumCY += p.y;
                    }
                    circles.push({
                        centerX: sumCX / cellPixels.length,
                        centerY: sumCY / cellPixels.length,
                        radius: calculateRadiusForPixels(cellPixels) * 0.8
                    });
                }
            }
        }
    }

    // Fallback to single circle if no circles generated
    if (circles.length === 0) {
        circles.push({
            centerX, centerY,
            radius: Math.sqrt(((maxX - minX) / 2) ** 2 + ((maxY - minY) / 2) ** 2)
        });
    }

    return circles.slice(0, targetCircles); // Limit to requested number
}

function calculateRadiusForPixels(pixels) {
    if (pixels.length === 0) return 10;

    let sumX = 0, sumY = 0;
    for (const p of pixels) {
        sumX += p.x;
        sumY += p.y;
    }
    const centerX = sumX / pixels.length;
    const centerY = sumY / pixels.length;

    let maxDist = 0;
    for (const p of pixels) {
        const dist = Math.hypot(p.x - centerX, p.y - centerY);
        maxDist = Math.max(maxDist, dist);
    }
    return maxDist;
}

function getDefaultBounds(width, height) {
    return {
        width, height,
        minX: 0, minY: 0,
        maxX: width, maxY: height,
        centerX: width / 2,
        centerY: height / 2,
        centerOfMassX: width / 2,
        centerOfMassY: width / 2,
        maxRadius: Math.max(width, height) / 2,
        boundingCircleRadius: Math.max(width, height) / 2,
        pixelCount: width * height,
        visiblePercent: 100,
        originalWidth: width,
        originalHeight: height,
        collisionCircles: [{ centerX: width / 2, centerY: height / 2, radius: Math.max(width, height) / 2 }]
    };
}

/**
 * Generate world-space colliders based on texture analysis
 */
export async function getOrGenerateColliders(texture, worldX, worldY, scale, propType) {
    if (!texture) return [];

    const cacheKey = `${propType.name}_${scale}_${COLLISION_CONFIG.circleCount}`;

    // Check cache
    if (colliderCache.has(cacheKey)) {
        const cached = colliderCache.get(cacheKey);
        return cached.map(c => ({
            ...c,
            x: worldX + (c.offsetX || 0),
            y: worldY + (c.offsetY || 0)
        }));
    }

    // Analyze texture to get visible shape
    const analysis = await analyzeTexture(texture);
    if (!analysis || !analysis.collisionCircles) {
        return [];
    }

    // Convert local collision circles to world space
    const colliders = [];

    for (const circle of analysis.collisionCircles) {
        // Convert from image local coordinates to sprite local coordinates
        const localX = (circle.centerX - analysis.originalWidth / 2) * scale;
        const localY = (circle.centerY - analysis.originalHeight / 2) * scale;
        const radius = circle.radius * scale * COLLISION_CONFIG.margin;

        colliders.push({
            x: worldX + localX,
            y: worldY + localY,
            r: radius,
            type: 'prop',
            propType: propType.name,
            damageOnTouch: propType.damageOnTouch || 0
        });
    }

    // Cache with relative offsets
    const cachedColliders = colliders.map(c => ({
        ...c,
        offsetX: c.x - worldX,
        offsetY: c.y - worldY
    }));
    colliderCache.set(cacheKey, cachedColliders);

    return colliders;
}

/**
 * Debug: Draw collision circles for visualization
 */
export function drawCollisionDebug(container, colliders, color = 0x00ff00) {
    const graphics = new Graphics();

    for (const collider of colliders) {
        if (collider.r) {
            graphics.circle(collider.x, collider.y, collider.r)
                .stroke({ width: 2, color: color, alpha: 0.8 });
            graphics.circle(collider.x, collider.y, 3)
                .fill({ color: 0xff0000 });
        }
    }

    container.addChild(graphics);
    return graphics;
}

/**
 * Clear caches
 */
export function clearTextureCache() {
    textureAnalysisCache.clear();
    colliderCache.clear();
    console.log('Texture analysis cache cleared');
}