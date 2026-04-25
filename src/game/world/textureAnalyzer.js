// textureAnalyzer.js
import { Texture, Assets } from 'pixi.js';

// Cache for analyzed textures
const textureCache = new Map();

/**
 * Analyze a texture to find its actual visible bounds and shape
 */
export async function analyzeTexture(texturePath) {
    if (textureCache.has(texturePath)) {
        return textureCache.get(texturePath);
    }

    try {
        const texture = await Assets.load(texturePath);
        const result = await analyzeTextureData(texture);
        textureCache.set(texturePath, result);
        return result;
    } catch (err) {
        console.warn(`Failed to analyze texture ${texturePath}:`, err);
        return null;
    }
}

/**
 * Analyze loaded texture to find visible pixels and calculate bounds
 */
async function analyzeTextureData(texture) {
    const img = texture.source.resource;
    if (!img || !img.naturalWidth) {
        return getDefaultBounds(texture);
    }

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
    let pixelCount = 0;
    let totalX = 0, totalY = 0;

    // Alpha threshold (consider pixels with alpha > 10 as visible)
    const ALPHA_THRESHOLD = 10;

    // Find bounds and center of mass
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const alpha = data[(y * canvas.width + x) * 4 + 3];
            if (alpha > ALPHA_THRESHOLD) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
                pixelCount++;
                totalX += x;
                totalY += y;
            }
        }
    }

    if (pixelCount === 0) {
        return getDefaultBounds(texture);
    }

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerOfMassX = totalX / pixelCount;
    const centerOfMassY = totalY / pixelCount;

    // Calculate radius based on average distance from center
    let totalDistance = 0;
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const alpha = data[(y * canvas.width + x) * 4 + 3];
            if (alpha > ALPHA_THRESHOLD) {
                const dx = x - centerX;
                const dy = y - centerY;
                totalDistance += Math.sqrt(dx * dx + dy * dy);
            }
        }
    }
    const avgRadius = totalDistance / pixelCount;

    // Also calculate bounding circle radius (farthest point from center)
    let maxRadius = 0;
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const alpha = data[(y * canvas.width + x) * 4 + 3];
            if (alpha > ALPHA_THRESHOLD) {
                const dx = x - centerX;
                const dy = y - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                maxRadius = Math.max(maxRadius, dist);
            }
        }
    }

    // Determine shape type based on aspect ratio and pixel distribution
    const aspectRatio = width / height;
    let shapeType = 'circle';
    if (aspectRatio > 1.5) shapeType = 'horizontal';
    else if (aspectRatio < 0.67) shapeType = 'vertical';
    else if (width > height * 1.2) shapeType = 'oval';

    // Calculate density distribution for irregular shapes
    const densityMap = calculateDensityMap(imageData, canvas.width, canvas.height, minX, minY, maxX, maxY);

    const result = {
        width,
        height,
        centerX,
        centerY,
        centerOfMassX,
        centerOfMassY,
        avgRadius,
        maxRadius,
        boundingCircleRadius: maxRadius,
        boundingBoxWidth: width,
        boundingBoxHeight: height,
        pixelCount,
        shapeType,
        densityMap,
        // Store original texture dimensions for scaling
        originalWidth: canvas.width,
        originalHeight: canvas.height,
        // Store pixel data for precise collision (optional, can be heavy)
        pixelData: null // Only store if needed, can be memory intensive
    };

    return result;
}

/**
 * Calculate density map for irregular shape detection
 */
function calculateDensityMap(imageData, width, height, minX, minY, maxX, maxY) {
    const mapWidth = maxX - minX + 1;
    const mapHeight = maxY - minY + 1;
    const map = new Array(mapHeight);

    for (let y = 0; y < mapHeight; y++) {
        map[y] = new Array(mapWidth);
        for (let x = 0; x < mapWidth; x++) {
            const px = minX + x;
            const py = minY + y;
            const alpha = imageData.data[(py * width + px) * 4 + 3];
            map[y][x] = alpha > 10 ? 1 : 0;
        }
    }

    return map;
}

function getDefaultBounds(texture) {
    return {
        width: texture.width,
        height: texture.height,
        centerX: texture.width / 2,
        centerY: texture.height / 2,
        avgRadius: Math.max(texture.width, texture.height) / 3,
        maxRadius: Math.max(texture.width, texture.height) / 2,
        boundingCircleRadius: Math.max(texture.width, texture.height) / 2,
        boundingBoxWidth: texture.width,
        boundingBoxHeight: texture.height,
        shapeType: 'circle',
        pixelCount: texture.width * texture.height
    };
}

/**
 * Generate optimized collision circles based on texture shape
 */
export async function generateCollisionCircles(texturePath, worldX, worldY, scale = 1, maxCircles = 4) {
    const analysis = await analyzeTexture(texturePath);
    if (!analysis) return null;

    const circles = [];
    const scaledCenterX = worldX + (analysis.centerX - analysis.originalWidth / 2) * scale;
    const scaledCenterY = worldY + (analysis.centerY - analysis.originalHeight / 2) * scale;

    // For simple shapes, just use a single circle
    if (analysis.shapeType === 'circle' || analysis.aspectRatio > 0.8 && analysis.aspectRatio < 1.2) {
        circles.push({
            x: scaledCenterX,
            y: scaledCenterY,
            r: analysis.maxRadius * scale * 0.85, // Slightly smaller for better gameplay
            type: 'prop',
            originalShape: analysis.shapeType
        });
    }
    // For elongated shapes, use multiple circles
    else if (analysis.shapeType === 'horizontal' || analysis.shapeType === 'vertical') {
        const isHorizontal = analysis.shapeType === 'horizontal';
        const mainRadius = (isHorizontal ? analysis.height : analysis.width) / 2 * scale * 0.8;
        const length = (isHorizontal ? analysis.width : analysis.height) * scale;
        const step = mainRadius * 1.5;
        const numCircles = Math.min(maxCircles, Math.ceil(length / step));

        for (let i = 0; i < numCircles; i++) {
            const t = i / (numCircles - 1) - 0.5;
            let offsetX = 0, offsetY = 0;
            if (isHorizontal) {
                offsetX = t * length;
            } else {
                offsetY = t * length;
            }

            circles.push({
                x: scaledCenterX + offsetX,
                y: scaledCenterY + offsetY,
                r: mainRadius * (0.7 + 0.3 * Math.sin(i * Math.PI / numCircles)),
                type: 'prop'
            });
        }
    }
    // For irregular shapes, use circle packing based on density
    else if (analysis.pixelCount > 500) {
        circles.push(...generateCirclePacking(analysis, worldX, worldY, scale, maxCircles));
    }
    // Fallback to bounding circle
    else {
        circles.push({
            x: scaledCenterX,
            y: scaledCenterY,
            r: analysis.maxRadius * scale * 0.8,
            type: 'prop'
        });
    }

    return circles;
}

/**
 * Generate circle packing for irregular shapes
 */
function generateCirclePacking(analysis, worldX, worldY, scale, maxCircles) {
    const circles = [];
    const densityMap = analysis.densityMap;
    if (!densityMap) return circles;

    const rows = densityMap.length;
    const cols = densityMap[0].length;
    const cellWidth = analysis.width / cols;
    const cellHeight = analysis.height / rows;

    // Find dense regions to place circles
    const regions = findDenseRegions(densityMap);

    for (let i = 0; i < Math.min(regions.length, maxCircles); i++) {
        const region = regions[i];
        const localX = region.centerX * cellWidth;
        const localY = region.centerY * cellHeight;
        const regionRadius = Math.sqrt(region.density) * Math.min(cellWidth, cellHeight) * 2;

        const worldXPos = worldX + (localX - analysis.centerX) * scale;
        const worldYPos = worldY + (localY - analysis.centerY) * scale;

        circles.push({
            x: worldXPos,
            y: worldYPos,
            r: regionRadius * scale * 0.8,
            type: 'prop',
            region: i
        });
    }

    return circles;
}

function findDenseRegions(densityMap) {
    const regions = [];
    const visited = new Set();
    const rows = densityMap.length;
    const cols = densityMap[0].length;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (densityMap[y][x] === 1 && !visited.has(`${x},${y}`)) {
                const region = floodFill(densityMap, x, y, visited);
                if (region.pixelCount > 10) {
                    regions.push(region);
                }
            }
        }
    }

    // Sort by density (pixel count) and take top ones
    regions.sort((a, b) => b.pixelCount - a.pixelCount);
    return regions;
}

function floodFill(densityMap, startX, startY, visited) {
    const queue = [{x: startX, y: startY}];
    const pixels = [];
    let totalX = 0, totalY = 0;

    while (queue.length > 0) {
        const {x, y} = queue.shift();
        const key = `${x},${y}`;
        if (visited.has(key)) continue;
        if (x < 0 || x >= densityMap[0].length || y < 0 || y >= densityMap.length) continue;
        if (densityMap[y][x] !== 1) continue;

        visited.add(key);
        pixels.push({x, y});
        totalX += x;
        totalY += y;

        queue.push({x: x+1, y}, {x: x-1, y}, {x, y: y+1}, {x, y: y-1});
    }

    return {
        centerX: totalX / pixels.length,
        centerY: totalY / pixels.length,
        pixelCount: pixels.length,
        density: pixels.length
    };
}

// Cache for generated colliders
const colliderCache = new Map();

export async function getOrGenerateColliders(texturePath, worldX, worldY, scale, propType) {
    const cacheKey = `${texturePath}|${scale}`;

    if (colliderCache.has(cacheKey)) {
        const cached = colliderCache.get(cacheKey);
        // Copy with new world position
        return cached.map(c => ({ ...c, x: worldX + (c.offsetX || 0), y: worldY + (c.offsetY || 0) }));
    }

    let colliders;
    if (propType.collisionType === 'pixel') {
        colliders = await generateCollisionCircles(texturePath, worldX, worldY, scale);
    } else {
        // Simple circle based on visual size
        const analysis = await analyzeTexture(texturePath);
        const radius = analysis.maxRadius * scale * (propType.margin || 0.8);
        colliders = [{
            x: worldX,
            y: worldY,
            r: radius,
            type: 'prop',
            propType: propType.name
        }];
    }

    // Store with relative offsets for caching
    const cachedColliders = colliders.map(c => ({
        ...c,
        offsetX: c.x - worldX,
        offsetY: c.y - worldY
    }));
    colliderCache.set(cacheKey, cachedColliders);

    return colliders;
}