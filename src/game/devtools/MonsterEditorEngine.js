import { Application, Circle, Container, Graphics } from 'pixi.js';
import {
    clonePoints,
    generateBezierShape,
    segmentCountFromBezierPoints,
} from './monsterEditorUtils.js';
import { loadShapeModel } from './monsterShapeRegistry.js';
import {
    computeBodyAnchor,
    drawLocalBezierShape,
    drawLocalEyeWedge,
    eyeWedgeScaleForMobSize,
    MOB_BODY_FILL_COLOR,
    REFERENCE_MOB_SIZE,
    toLocalShapePoint,
    toLocalShapePoints,
    toPixiColor,
} from '../voidShapeLayout.js';

const PART_COLORS = {
    default: { fill: 0x44cc88 },
};

const EYE_SIZE_HANDLE_RADIUS = 20;
const HANDLE_HIT_RADIUS = 14;
const HANDLE_DRAW_RADIUS = 7;

/**
 * Pixi-based void monster shape editor (mounts into a DOM element).
 */
export class MonsterEditorEngine {
    /** @param {HTMLElement} host */
    constructor(host) {
        this.host = host;
        /** @type {import('pixi.js').Application | null} */
        this.app = null;
        this.stage = null;
        this.petRoot = null;
        /** @type {import('pixi.js').Container | null} */
        this.handlesRoot = null;
        this.bodyG = null;
        this.eyeG = null;
        this.originG = null;
        /** @type {{ x: number, y: number }} */
        this._anchor = { x: 0, y: 0 };
        /** Frozen anchor while dragging so handles don't drift. */
        this._dragAnchor = null;
        this._previewScale = 1;
        /** @type {Map<string, Graphics>} */
        this.partGraphics = new Map();
        /** @type {Graphics[]} */
        this.handles = [];
        this.activePart = 'body';
        this.model = loadShapeModel('VOID_SHAPE_7');
        /** @type {{ handle: Graphics, onDesignMove: (d: { x: number, y: number }) => void } | null} */
        this._drag = null;
        this._destroyed = false;
        /** @type {(() => void) | null} */
        this.onModelChange = null;
        this._onGlobalPointerMove = this._onGlobalPointerMove.bind(this);
        this._onGlobalPointerUp = this._onGlobalPointerUp.bind(this);
        this._onResize = () => this._layout();
        /** @type {ResizeObserver | null} */
        this._resizeObserver = null;
    }

    _isAlive() {
        return !this._destroyed && this.app && !this.app.destroyed;
    }

    _layoutAnchor() {
        return this._dragAnchor ?? this._anchor;
    }

    async init() {
        if (this.app || this._destroyed) return;

        const host = this.host;
        const width = Math.max(1, host.clientWidth || 800);
        const height = Math.max(1, host.clientHeight || 520);

        const app = new Application();
        await app.init({
            background: '#ffffff',
            width,
            height,
            antialias: true,
        });

        if (this._destroyed || !this.host) {
            this._teardownApplication(app);
            return;
        }

        host.innerHTML = '';
        host.appendChild(app.canvas);
        app.canvas.style.cursor = 'crosshair';
        app.canvas.style.touchAction = 'none';
        app.stage.eventMode = 'static';
        app.stage.hitArea = app.screen;

        this.app = app;
        this.stage = new Container();
        app.stage.addChild(this.stage);

        app.stage.on('pointermove', this._onGlobalPointerMove);
        app.stage.on('pointerup', this._onGlobalPointerUp);
        app.stage.on('pointerupoutside', this._onGlobalPointerUp);
        app.renderer.on('resize', this._onResize);

        this._resizeObserver = new ResizeObserver(() => {
            if (this._destroyed || !this.app || this.app.destroyed) return;
            const w = Math.max(1, host.clientWidth);
            const h = Math.max(1, host.clientHeight);
            this.app.renderer.resize(w, h);
            this._layout();
        });
        this._resizeObserver.observe(host);

        this._rebuildPet();
    }

    /** @param {import('pixi.js').Application} app */
    _teardownApplication(app) {
        if (!app || app.destroyed) return;
        try {
            if (typeof app.stop === 'function') app.stop();
        } catch {
            /* ignore */
        }
        try {
            if ('resizeTo' in app) app.resizeTo = null;
        } catch {
            /* ignore */
        }
        try {
            app.destroy(true, { children: true });
        } catch {
            /* ignore */
        }
    }

    destroy() {
        if (this._destroyed) return;
        this._destroyed = true;
        this._drag = null;
        this._dragAnchor = null;
        this.onModelChange = null;

        this._resizeObserver?.disconnect();
        this._resizeObserver = null;

        const app = this.app;
        const editorStage = this.stage;
        this.app = null;
        this.stage = null;
        this.petRoot = null;
        this.handlesRoot = null;
        this.bodyG = null;
        this.eyeG = null;
        this.originG = null;
        this.handles = [];
        this.partGraphics.clear();

        if (!app || app.destroyed) {
            if (this.host) this.host.innerHTML = '';
            return;
        }

        try {
            if (typeof app.stop === 'function') app.stop();
        } catch {
            /* ignore */
        }

        try {
            if ('resizeTo' in app) app.resizeTo = null;
        } catch {
            /* ignore */
        }

        const pixiStage = app.stage;
        if (pixiStage && !pixiStage.destroyed) {
            pixiStage.off('pointermove', this._onGlobalPointerMove);
            pixiStage.off('pointerup', this._onGlobalPointerUp);
            pixiStage.off('pointerupoutside', this._onGlobalPointerUp);
            pixiStage.eventMode = 'passive';
            pixiStage.hitArea = null;
        }

        if (app.renderer && !app.renderer.destroyed) {
            app.renderer.off('resize', this._onResize);
        }

        if (editorStage && !editorStage.destroyed && pixiStage && !pixiStage.destroyed) {
            try {
                pixiStage.removeChild(editorStage);
                editorStage.destroy({ children: true });
            } catch {
                /* ignore */
            }
        }

        try {
            if (app.canvas?.parentNode) {
                app.canvas.parentNode.removeChild(app.canvas);
            }
        } catch {
            /* ignore */
        }

        try {
            app.destroy(true, { children: true });
        } catch (err) {
            console.warn('[MonsterEditor] destroy:', err);
        }

        if (this.host) this.host.innerHTML = '';
    }

    _layout() {
        if (!this._isAlive() || !this.petRoot) return;
        this.petRoot.x = this.app.screen.width / 2;
        this.petRoot.y = this.app.screen.height / 2;
        if (this.handlesRoot) {
            this.handlesRoot.x = 0;
            this.handlesRoot.y = 0;
        }
    }

    loadShapeKey(key) {
        this.model = loadShapeModel(key);
        this.activePart = 'body';
        this._rebuildPet();
    }

    getShapeKey() {
        return this._shapeKey ?? 'VOID_SHAPE_7';
    }

    setShapeKey(key) {
        this._shapeKey = key;
        this.loadShapeKey(key);
    }

    getModel() {
        return {
            body: clonePoints(this.model.body),
            eye: { ...this.model.eye },
            parts: this.model.parts.map((p) => ({
                ...p,
                points: p.points ? clonePoints(p.points) : undefined,
            })),
        };
    }

    setActivePart(partId) {
        this.activePart = partId;
        this._refreshHandles();
    }

    getActivePart() {
        return this.activePart;
    }

    getPartList() {
        return [
            { id: 'body', label: 'Body', type: 'bezier' },
            { id: 'eye', label: 'Eye', type: 'eye' },
            ...this.model.parts.map((p) => ({
                id: p.id,
                label: p.label || p.id,
                type: p.type,
            })),
        ];
    }

    getActiveSegmentCount() {
        if (this.activePart === 'body') {
            return segmentCountFromBezierPoints(this.model.body);
        }
        const part = this.model.parts.find((p) => p.id === this.activePart);
        if (part?.type === 'bezier') {
            return segmentCountFromBezierPoints(part.points);
        }
        return 1;
    }

    setActiveSegmentCount(segments) {
        const n = Math.max(1, Math.min(12, segments));
        if (this.activePart === 'body') {
            this.model.body = generateBezierShape(n, 140);
        } else {
            const part = this.model.parts.find((p) => p.id === this.activePart);
            if (part?.type === 'bezier') {
                part.points = generateBezierShape(n, 100);
            }
        }
        this._redrawAll();
        this._refreshHandles();
    }

    addPart(type = 'bezier') {
        const id = `part_${Date.now().toString(36).slice(-5)}`;
        const part =
            type === 'circle'
                ? {
                      id,
                      label: id,
                      type: 'circle',
                      x: 40,
                      y: -60,
                      r: 24,
                      color: 0xffaa44,
                  }
                : {
                      id,
                      label: id,
                      type: 'bezier',
                      color: PART_COLORS.default.fill,
                      points: generateBezierShape(2, 80),
                  };
        this.model.parts.push(part);
        this.activePart = id;
        this._rebuildPet();
        return id;
    }

    removePart(partId) {
        this.model.parts = this.model.parts.filter((p) => p.id !== partId);
        if (this.activePart === partId) this.activePart = 'body';
        this._rebuildPet();
    }

    renamePart(partId, label) {
        const part = this.model.parts.find((p) => p.id === partId);
        if (part) part.label = label;
    }

    getEyePosition() {
        return { x: this.model.eye.x, y: this.model.eye.y };
    }

    setEyePosition(x, y) {
        this.model.eye.x = x;
        this.model.eye.y = y;
        this._redrawAll();
        this._refreshHandles();
    }

    getEyeSize() {
        return this.model.eye.size ?? 1;
    }

    setEyeSize(size) {
        this.model.eye.size = Math.max(0.25, Math.min(4, size));
        this._redrawAll();
        this._refreshHandles();
    }

    _rebuildPet() {
        if (!this._isAlive() || !this.stage) return;

        this._clearHandles();
        this.stage.removeChildren();

        this.petRoot = new Container();
        this.petRoot.sortableChildren = true;
        this.stage.addChild(this.petRoot);

        this.bodyG = new Graphics();
        this.bodyG.zIndex = 1;
        this.petRoot.addChild(this.bodyG);

        for (const part of this.model.parts) {
            const g = new Graphics();
            g.zIndex = 2;
            this.petRoot.addChild(g);
            this.partGraphics.set(part.id, g);
        }

        this.eyeG = new Graphics();
        this.eyeG.zIndex = 5;
        this.petRoot.addChild(this.eyeG);

        this.originG = new Graphics();
        this.originG.zIndex = 0;
        this.petRoot.addChild(this.originG);

        this.handlesRoot = new Container();
        this.handlesRoot.zIndex = 100;
        this.handlesRoot.eventMode = 'static';
        this.handlesRoot.sortableChildren = true;
        this.petRoot.addChild(this.handlesRoot);

        this._layout();
        this._updateAnchor();
        this._redrawShapes();
        this._refreshHandles();
    }

    _clearHandles() {
        for (const h of this.handles) {
            if (h && !h.destroyed) h.destroy();
        }
        this.handles = [];
    }

    _updateAnchor() {
        this._anchor = computeBodyAnchor(this.model.body);
    }

    _toLocal(p) {
        return toLocalShapePoint(p, this._layoutAnchor(), this._previewScale);
    }

    _toLocalPoints(points) {
        return toLocalShapePoints(points, this._layoutAnchor(), this._previewScale);
    }

    _localToDesign(lx, ly) {
        const s = this._previewScale || 1;
        const a = this._layoutAnchor();
        return {
            x: lx / s + a.x,
            y: ly / s + a.y,
        };
    }

    /** @param {import('pixi.js').PointData} globalPos */
    _globalToDesign(globalPos) {
        if (!this.handlesRoot || this.handlesRoot.destroyed) {
            return { x: 0, y: 0 };
        }
        const local = this.handlesRoot.toLocal(globalPos);
        return this._localToDesign(local.x, local.y);
    }

    _redrawAll() {
        if (!this._isAlive()) return;
        this._updateAnchor();
        this._redrawShapes();
    }

    _redrawShapes() {
        if (!this._isAlive() || !this.bodyG || this.bodyG.destroyed) return;

        drawLocalBezierShape(
            this.bodyG,
            this._toLocalPoints(this.model.body),
            MOB_BODY_FILL_COLOR,
            0,
            0
        );

        for (const part of this.model.parts) {
            const g = this.partGraphics.get(part.id);
            if (!g || g.destroyed) continue;
            if (part.type === 'bezier') {
                drawLocalBezierShape(
                    g,
                    this._toLocalPoints(part.points),
                    toPixiColor(part.color, PART_COLORS.default.fill),
                    0,
                    0
                );
            } else if (part.type === 'circle') {
                const local = this._toLocal(part);
                g.clear();
                g.circle(local.x, local.y, (part.r ?? 12) * this._previewScale).fill({
                    color: toPixiColor(part.color, 0xffaa44),
                    alpha: 0.9,
                });
            }
        }

        if (this.eyeG && !this.eyeG.destroyed) {
            const eyeLocal = this._toLocal(this.model.eye);
            const eyeMul = this.model.eye.size ?? 1;
            drawLocalEyeWedge(
                this.eyeG,
                eyeLocal.x,
                eyeLocal.y,
                eyeWedgeScaleForMobSize(REFERENCE_MOB_SIZE, eyeMul),
                0xffffff
            );
        }

        if (this.originG && !this.originG.destroyed) {
            this.originG.clear();
            this.originG.moveTo(-12, 0).lineTo(12, 0);
            this.originG.moveTo(0, -12).lineTo(0, 12);
            this.originG.stroke({ width: 1, color: 0x888888, alpha: 0.45 });
        }
    }

    _refreshHandles() {
        if (!this._isAlive() || !this.handlesRoot) return;
        this._clearHandles();

        if (this.activePart === 'body') {
            this._createBezierHandles(this.model.body, (i, d) => {
                this.model.body[i].x = d.x;
                this.model.body[i].y = d.y;
                this._redrawShapes();
            });
        } else if (this.activePart === 'eye') {
            this._createPointHandle(this.model.eye, 0xffcc00, (d) => {
                this.model.eye.x = d.x;
                this.model.eye.y = d.y;
                this._redrawShapes();
            });
            this._createPointHandle(
                {
                    x: this.model.eye.x + EYE_SIZE_HANDLE_RADIUS * (this.model.eye.size ?? 1),
                    y: this.model.eye.y,
                },
                0x00d4ff,
                (d) => {
                    const dist = Math.hypot(d.x - this.model.eye.x, d.y - this.model.eye.y);
                    this.model.eye.size = Math.max(
                        0.25,
                        Math.min(4, dist / EYE_SIZE_HANDLE_RADIUS)
                    );
                    this._redrawShapes();
                }
            );
        } else {
            const part = this.model.parts.find((p) => p.id === this.activePart);
            if (!part) return;

            if (part.type === 'bezier') {
                this._createBezierHandles(part.points, (i, d) => {
                    part.points[i].x = d.x;
                    part.points[i].y = d.y;
                    this._redrawShapes();
                });
            } else if (part.type === 'circle') {
                this._createPointHandle(part, 0xffcc00, (d) => {
                    part.x = d.x;
                    part.y = d.y;
                    this._redrawShapes();
                });
                this._createPointHandle(
                    { x: part.x + part.r, y: part.y },
                    0x00d4ff,
                    (d) => {
                        part.r = Math.max(4, Math.hypot(d.x - part.x, d.y - part.y));
                        this._redrawShapes();
                    }
                );
            }
        }

        this._syncAllHandlePositions();
    }

    /**
     * @param {import('./monsterEditorUtils.js').Point[]} points
     * @param {(index: number, design: { x: number, y: number }) => void} onDesignMove
     */
    _createBezierHandles(points, onDesignMove) {
        points.forEach((p, i) => {
            this._createPointHandle(p, i === 0 ? 0xffcc00 : 0x00d4ff, (d) => onDesignMove(i, d));
        });
    }

    /** @param {{ x: number, y: number }} designPoint */
    _createPointHandle(designPoint, color, onDesignMove) {
        if (!this.handlesRoot) return;

        const local = this._toLocal(designPoint);
        const h = new Graphics()
            .circle(0, 0, HANDLE_DRAW_RADIUS)
            .fill({ color })
            .stroke({ width: 2, color: 0xffffff, alpha: 0.5 });
        h.x = local.x;
        h.y = local.y;
        h.hitArea = new Circle(0, 0, HANDLE_HIT_RADIUS);
        h.eventMode = 'static';
        h.cursor = 'grab';
        h.on('pointerdown', (e) => {
            if (!this._isAlive()) return;
            e.stopPropagation();
            this._dragAnchor = { ...this._anchor };
            this._drag = { handle: h, onDesignMove };
            h.cursor = 'grabbing';
            if (typeof e.pointerId === 'number' && h.parent) {
                try {
                    h.parent.setPointerCapture?.(e.pointerId);
                } catch {
                    /* Pixi capture optional */
                }
            }
        });
        this.handlesRoot.addChild(h);
        this.handles.push(h);
    }

    _syncAllHandlePositions() {
        if (!this._isAlive() || this._drag) return;

        if (this.activePart === 'body') {
            this._syncBezierHandlePositions(this.model.body);
        } else if (this.activePart === 'eye') {
            this._syncHandlePosition(this.model.eye, 0);
            if (this.handles.length >= 2) {
                this._syncHandlePosition(
                    {
                        x: this.model.eye.x + EYE_SIZE_HANDLE_RADIUS * (this.model.eye.size ?? 1),
                        y: this.model.eye.y,
                    },
                    1
                );
            }
        } else {
            const part = this.model.parts.find((p) => p.id === this.activePart);
            if (!part) return;
            if (part.type === 'bezier') this._syncBezierHandlePositions(part.points);
            if (part.type === 'circle' && this.handles.length >= 2) {
                this._syncHandlePosition(part, 0);
                this._syncHandlePosition({ x: part.x + part.r, y: part.y }, 1);
            }
        }
    }

    _syncHandlePosition(designPoint, index) {
        const h = this.handles[index];
        if (!h || h.destroyed) return;
        const local = this._toLocal(designPoint);
        h.x = local.x;
        h.y = local.y;
    }

    _syncBezierHandlePositions(points) {
        points.forEach((p, i) => this._syncHandlePosition(p, i));
    }

    _onGlobalPointerMove(e) {
        if (!this._drag || !this._isAlive() || !this.handlesRoot) return;

        const design = this._globalToDesign(e.global);
        this._drag.onDesignMove(design);

        const local = this._toLocal(design);
        this._drag.handle.x = local.x;
        this._drag.handle.y = local.y;

        if (this.activePart === 'eye' && this.handles.length >= 2 && this._drag.handle !== this.handles[0]) {
            const posLocal = this._toLocal(this.model.eye);
            this.handles[0].x = posLocal.x;
            this.handles[0].y = posLocal.y;
        } else if (this.activePart === 'eye' && this.handles.length >= 2 && this._drag.handle === this.handles[0]) {
            const sizeLocal = this._toLocal({
                x: this.model.eye.x + EYE_SIZE_HANDLE_RADIUS * (this.model.eye.size ?? 1),
                y: this.model.eye.y,
            });
            this.handles[1].x = sizeLocal.x;
            this.handles[1].y = sizeLocal.y;
        } else if (this.activePart !== 'eye') {
            const part = this.model.parts.find((p) => p.id === this.activePart);
            if (part?.type === 'circle' && this.handles.length >= 2) {
                if (this._drag.handle === this.handles[0]) {
                    const rim = this._toLocal({ x: part.x + part.r, y: part.y });
                    this.handles[1].x = rim.x;
                    this.handles[1].y = rim.y;
                } else {
                    const center = this._toLocal(part);
                    this.handles[0].x = center.x;
                    this.handles[0].y = center.y;
                }
            }
        }
    }

    _onGlobalPointerUp() {
        if (!this._drag) return;

        const hadDrag = true;
        if (this._drag.handle && !this._drag.handle.destroyed) {
            this._drag.handle.cursor = 'grab';
        }
        this._drag = null;
        this._dragAnchor = null;
        this._updateAnchor();
        this._redrawShapes();
        this._syncAllHandlePositions();
        if (hadDrag) this.onModelChange?.();
    }
}
