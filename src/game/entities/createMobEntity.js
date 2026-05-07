import {
    Container,
    Graphics,
    Sprite,
    RenderTexture
} from "pixi.js";

import {BIOME_COLORS} from "../constants.js";

// voidpet editor https://pixijs.com/8.x/playground?state=ImltcG9ydCAqIGFzIFBJWEkgZnJvbSAncGl4aS5qcyc7XG5cbihhc3luYyAoKSA9PiB7XG5cblxuY29uc3QgYXBwID0gbmV3IFBJWEkuQXBwbGljYXRpb24oKTtcbmF3YWl0IGFwcC5pbml0KHtcbiAgICByZXNpemVUbzogd2luZG93LFxuICAgIGJhY2tncm91bmQ6ICcjMGIwYjE0JyxcbiAgICBhbnRpYWxpYXM6IHRydWVcbn0pO1xuXG4gICAgLy8gSU1QT1JUQU5UIGZvciBQaXhpSlMgOFxuICAgIGFwcC5zdGFnZS5ldmVudE1vZGUgPSAnc3RhdGljJztcblxuZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChhcHAuY2FudmFzKTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gUk9PVFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PVxuY29uc3Qgc3RhZ2UgPSBuZXcgUElYSS5Db250YWluZXIoKTtcbmFwcC5zdGFnZS5hZGRDaGlsZChzdGFnZSk7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNUQVRFXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09XG5sZXQgcG9pbnRzID0gZ2VuZXJhdGVJbml0aWFsVm9pZFNoYXBlKDE0MCk7XG5sZXQgYm9keUcgPSBuZXcgUElYSS5HcmFwaGljcygpO1xubGV0IGhhbmRsZXMgPSBbXTtcbmxldCBzZWxlY3RlZCA9IG51bGw7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFZPSURQRVQgU0hBUEUgUkVOREVSXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09XG5mdW5jdGlvbiBkcmF3U2hhcGUoZywgcHRzKSB7XG4gICAgZy5jbGVhcigpO1xuXG4gICAgY29uc3QgcCA9IHB0cztcblxuICAgIGcubW92ZVRvKHBbMF0ueCwgcFswXS55KTtcblxuICAgIGZvciAobGV0IGkgPSAxOyBpIDwgcC5sZW5ndGggLSAyOyBpICs9IDMpIHtcbiAgICAgICAgZy5iZXppZXJDdXJ2ZVRvKFxuICAgICAgICAgICAgcFtpXS54LCBwW2ldLnksXG4gICAgICAgICAgICBwW2kgKyAxXS54LCBwW2kgKyAxXS55LFxuICAgICAgICAgICAgcFtpICsgMl0ueCwgcFtpICsgMl0ueVxuICAgICAgICApO1xuICAgIH1cblxuICAgIGcuY2xvc2VQYXRoKCk7XG5cbiAgICBnLmZpbGwoeyBjb2xvcjogMHg3YzVjZmYsIGFscGhhOiAxIH0pO1xuICAgIGcuc3Ryb2tlKHsgd2lkdGg6IDMsIGNvbG9yOiAweDJhMWE0YSwgYWxwaGE6IDAuNiB9KTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVk9JRFBFVCBJTklUSUFMIFNIQVBFXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09XG5mdW5jdGlvbiBnZW5lcmF0ZUluaXRpYWxWb2lkU2hhcGUoc2l6ZSkge1xuICAgIHJldHVybiBbXG4gICAgICAgIHsgeDogMCwgeTogLXNpemUgfSxcblxuICAgICAgICB7IHg6IC1zaXplICogMC45LCB5OiAtc2l6ZSAqIDAuNiB9LFxuICAgICAgICB7IHg6IC1zaXplICogMS4yLCB5OiAwIH0sXG4gICAgICAgIHsgeDogLXNpemUgKiAwLjYsIHk6IHNpemUgKiAwLjggfSxcblxuICAgICAgICB7IHg6IC1zaXplICogMC4yLCB5OiBzaXplICogMS4xIH0sXG4gICAgICAgIHsgeDogc2l6ZSAqIDAuMywgeTogc2l6ZSAqIDAuOSB9LFxuICAgICAgICB7IHg6IHNpemUgKiAwLjksIHk6IDAgfSxcblxuICAgICAgICB7IHg6IHNpemUgKiAwLjcsIHk6IC1zaXplICogMC44IH0sXG4gICAgICAgIHsgeDogc2l6ZSAqIDAuMiwgeTogLXNpemUgKiAxLjEgfSxcbiAgICAgICAgeyB4OiAwLCB5OiAtc2l6ZSB9XG4gICAgXTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ1JFQVRFIFZPSURQRVRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT1cbmZ1bmN0aW9uIGNyZWF0ZVZvaWRQZXQoeCwgeSkge1xuICAgIGNvbnN0IGMgPSBuZXcgUElYSS5Db250YWluZXIoKTtcbiAgICBjLnggPSB4O1xuICAgIGMueSA9IHk7XG5cbiAgICBjb25zdCBnID0gbmV3IFBJWEkuR3JhcGhpY3MoKTtcbiAgICBjLmFkZENoaWxkKGcpO1xuXG4gICAgYy5zaGFwZSA9IHBvaW50cy5tYXAocCA9PiAoeyAuLi5wIH0pKTtcblxuICAgIGRyYXdTaGFwZShnLCBjLnNoYXBlKTtcblxuICAgIHN0YWdlLmFkZENoaWxkKGMpO1xuXG4gICAgY3JlYXRlSGFuZGxlcyhjLCBnKTtcblxuICAgIHJldHVybiBjO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBEUkFHIFBPSU5UIEhBTkRMRVNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT1cbmZ1bmN0aW9uIGNyZWF0ZUhhbmRsZXMoY29udGFpbmVyLCBnZngpIHtcbiAgICBoYW5kbGVzLmZvckVhY2goaCA9PiBoLmRlc3Ryb3koKSk7XG4gICAgaGFuZGxlcyA9IFtdO1xuXG4gICAgY29udGFpbmVyLnNoYXBlLmZvckVhY2goKHAsIGkpID0%2BIHtcbiAgICAgICAgY29uc3QgaCA9IG5ldyBQSVhJLkdyYXBoaWNzKClcbiAgICAgICAgICAgIC5jaXJjbGUoMCwgMCwgNilcbiAgICAgICAgICAgIC5maWxsKHsgY29sb3I6IGkgPT09IDAgPyAweGZmY2MwMCA6IDB4MDBkNGZmIH0pO1xuXG4gICAgICAgIGgueCA9IGNvbnRhaW5lci54ICsgcC54O1xuICAgICAgICBoLnkgPSBjb250YWluZXIueSArIHAueTtcblxuICAgICAgICBoLmV2ZW50TW9kZSA9ICdzdGF0aWMnO1xuICAgICAgICBoLmN1cnNvciA9ICdwb2ludGVyJztcblxuICAgICAgICBsZXQgZHJhZ2dpbmcgPSBmYWxzZTtcblxuICAgICAgICBoLm9uKCdwb2ludGVyZG93bicsICgpID0%2BIHtcbiAgICAgICAgICAgIGRyYWdnaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIHNlbGVjdGVkID0gaTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgYXBwLnN0YWdlLm9uKCdwb2ludGVybW92ZScsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnaGVyZSBwb2ludGVyIG1vdmUnKTtcbiAgICAgICAgICAgIGlmICghZHJhZ2dpbmcpIHJldHVybjtcblxuICAgICAgICAgICAgY29uc3QgcG9zID0gZS5nbG9iYWw7XG5cbiAgICAgICAgICAgIGgueCA9IHBvcy54O1xuICAgICAgICAgICAgaC55ID0gcG9zLnk7XG5cbiAgICAgICAgICAgIGNvbnRhaW5lci5zaGFwZVtpXS54ID0gcG9zLnggLSBjb250YWluZXIueDtcbiAgICAgICAgICAgIGNvbnRhaW5lci5zaGFwZVtpXS55ID0gcG9zLnkgLSBjb250YWluZXIueTtcblxuICAgICAgICAgICAgZHJhd1NoYXBlKGdmeCwgY29udGFpbmVyLnNoYXBlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaC5vbigncG9pbnRlcnVwJywgKCkgPT4gZHJhZ2dpbmcgPSBmYWxzZSk7XG4gICAgICAgIGgub24oJ3BvaW50ZXJ1cG91dHNpZGUnLCAoKSA9PiBkcmFnZ2luZyA9IGZhbHNlKTtcblxuICAgICAgICBhcHAuc3RhZ2UuYWRkQ2hpbGQoaCk7XG4gICAgICAgIGhhbmRsZXMucHVzaChoKTtcbiAgICB9KTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU0FWRSBTSEFQRVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PVxuZnVuY3Rpb24gc2F2ZVNoYXBlKCkge1xuICAgIGNvbnN0IHBldCA9IHN0YWdlLmNoaWxkcmVuWzBdOyAvLyB5b3VyIGFjdGl2ZSB2b2lkcGV0XG5cbiAgICBpZiAoIXBldD8uc2hhcGUpIHJldHVybjtcblxuICAgIGNvbnN0IGRhdGEgPSBKU09OLnN0cmluZ2lmeShwZXQuc2hhcGUpO1xuXG4gICAgY29uc29sZS5sb2coXCJTQVZFRCBTSEFQRTpcIiwgZGF0YSk7XG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJ2b2lkcGV0X3NoYXBlXCIsIGRhdGEpO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMT0FEIFNIQVBFXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09XG5mdW5jdGlvbiBsb2FkU2hhcGUoKSB7XG4gICAgY29uc3QgZGF0YSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwidm9pZHBldF9zaGFwZVwiKTtcbiAgICBpZiAoIWRhdGEpIHJldHVybjtcblxuICAgIHBvaW50cyA9IEpTT04ucGFyc2UoZGF0YSk7XG4gICAgc3RhZ2UucmVtb3ZlQ2hpbGRyZW4oKTtcblxuICAgIGJvZHlHID0gbmV3IFBJWEkuR3JhcGhpY3MoKTtcbiAgICBzdGFnZS5hZGRDaGlsZChib2R5Ryk7XG5cbiAgICBjcmVhdGVWb2lkUGV0KGFwcC5zY3JlZW4ud2lkdGggLyAyLCBhcHAuc2NyZWVuLmhlaWdodCAvIDIpO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBVSVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PVxuY29uc3QgYnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG5idG4uaW5uZXJUZXh0ID0gXCJTYXZlIFNoYXBlXCI7XG5idG4uc3R5bGUucG9zaXRpb24gPSBcImZpeGVkXCI7XG5idG4uc3R5bGUudG9wID0gXCIxMHB4XCI7XG5idG4uc3R5bGUubGVmdCA9IFwiMTBweFwiO1xuYnRuLm9uY2xpY2sgPSBzYXZlU2hhcGU7XG5kb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGJ0bik7XG5cbmNvbnN0IGJ0bjIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcbmJ0bjIuaW5uZXJUZXh0ID0gXCJMb2FkIFNoYXBlXCI7XG5idG4yLnN0eWxlLnBvc2l0aW9uID0gXCJmaXhlZFwiO1xuYnRuMi5zdHlsZS50b3AgPSBcIjQwcHhcIjtcbmJ0bjIuc3R5bGUubGVmdCA9IFwiMTBweFwiO1xuYnRuMi5vbmNsaWNrID0gbG9hZFNoYXBlO1xuZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChidG4yKTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSU5JVFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PVxuY3JlYXRlVm9pZFBldChhcHAuc2NyZWVuLndpZHRoIC8gMiwgYXBwLnNjcmVlbi5oZWlnaHQgLyAyKTtcbn0pKCk7Ig%3D%3D

// your editor-exported shape
const VOID_SHAPE = [
    {"x": 86.5, "y": -129.5},
    {"x": -137.5, "y": -175.5},
    {"x": -137.5, "y": 60.5},
    {"x": -362.5, "y": 115.5},
    {"x": -28, "y": 154},
    {"x": 42, "y": 126},
    {"x": -1.5, "y": 54.5},
    {"x": -30.5, "y": -40.5},
    {"x": 373.5, "y": 28.5},
    {"x": 196.5, "y": -91.5}
];

// texture cache
const textureCache = new Map();

function drawVoidShape(g, pts, scale = 1, color = 0x7c5cff) {
    g.clear();

    color = "rgba(0,0,0,1)"

    if (!pts || pts.length < 2) return;

    g.moveTo(
        pts[0].x * scale,
        pts[0].y * scale
    );

    for (let i = 1; i < pts.length - 2; i += 3) {
        g.bezierCurveTo(
            pts[i].x * scale,
            pts[i].y * scale,

            pts[i + 1].x * scale,
            pts[i + 1].y * scale,

            pts[i + 2].x * scale,
            pts[i + 2].y * scale
        );
    }

    g.closePath();

    g.fill({
        color,
        alpha: 1
    });
}

function getMobTexture(renderer, size, color) {
    const key = `${size}_${color}`;

    if (textureCache.has(key)) {
        return textureCache.get(key);
    }

    const g = new Graphics();

    const scale = size / 140;

    drawVoidShape(g, VOID_SHAPE, scale, color);

    // IMPORTANT
    // generate texture ONCE
    const texture = renderer.generateTexture({
        target: g,
        resolution: 1,
        antialias: true
    });

    textureCache.set(key, texture);

    g.destroy();

    return texture;
}

export function createMobEntity(
    renderer,
    biome,
    size = 1,
    colorOverride = null
) {
    const c = new Container();

    c.baseScaleX = 1;
    c.baseScaleY = 1;

    const biomeData = BIOME_COLORS[biome] || {};

    const color =
        colorOverride ??
        biomeData.accent ??
        0xc9184a;

    // =========================
    // SHADOW
    // =========================

    const shadow = new Graphics();

    shadow
        .ellipse(0, size + 5, size + 10, 6)
        .fill({
            color: 0x000000,
            alpha: 0.2
        });

    c.addChild(shadow);

    // =========================
    // BODY SPRITE
    // =========================

    const texture = getMobTexture(
        renderer,
        size,
        color
    );

    const body = new Sprite(texture);

    // center correctly
    body.anchor.set(0.5);

    c.addChild(body);

// =========================
// EYE
// =========================

    const eye = new Graphics();

    const eyeX = 14;
    const eyeY = -5;

    // triangle eye
    eye.moveTo(eyeX, eyeY)                    // starting point (center of eye)
        .lineTo(eyeX - 10, eyeY - 2)           // left upper point
        .lineTo(eyeX - 8, eyeY + 2)           // left lower point
        .closePath()
        .fill(0xffffff);

    c.addChild(eye);

    // =========================
    // HP BAR
    // =========================

    const hpBg = new Graphics();

    const barWidth = size * 2 + 6;
    const barY = -size - 14;

    hpBg
        .rect(
            -size - 3,
            barY,
            barWidth,
            5
        )
        .fill({
            color: 0x111111,
            alpha: 0.8
        });

    c.addChild(hpBg);

    const hpBar = new Graphics();

    hpBar
        .rect(
            -size - 2,
            barY + 1,
            size * 2 + 4,
            3
        )
        .fill(0xff4444);

    c.addChild(hpBar);

    c.userData = {
        size,
        barY,
        barWidth
    };

    return {
        c,
        body,
        hpBar
    };
}