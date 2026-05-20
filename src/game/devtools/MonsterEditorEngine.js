import { Application, Container, Graphics } from 'pixi.js';
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
        this.bodyG = null;
        this.eyeG = null;
        this.originG = null;
        /** @type {{ x: number, y: number }} */
        this._anchor = { x: 0, y: 0 };
        /** Preview matches in-game at REFERENCE_MOB_SIZE (scale 1). */
        this._previewScale = 1;
        /** @type {Map<string, Graphics>} */
        this.partGraphics = new Map();
        /** @type {Graphics[]} */
        this.handles = [];
        this.activePart = 'body';
        this.model = loadShapeModel('VOID_SHAPE_7');
        this._drag = null;
        /** @type {(() => void) | null} */
        this.onModelChange = null;
        this._onPointerMove = this._onPointerMove.bind(this);
        this._onPointerUp = this._onPointerUp.bind(this);
    }

    async init() {
        if (this.app) return;

        const app = new Application();
        await app.init({
            background: '#0b0b14',
            antialias: true,
            resizeTo: this.host,
        });

        this.host.innerHTML = '';
        this.host.appendChild(app.canvas);
        app.stage.eventMode = 'static';

        this.app = app;
        this.stage = new Container();
        app.stage.addChild(this.stage);

        app.stage.on('pointermove', this._onPointerMove);
        app.stage.on('pointerup', this._onPointerUp);
        app.stage.on('pointerupoutside', this._onPointerUp);

        this._layout();
        this._rebuildPet();
    }

    destroy() {
        if (this.app) {
            this.app.stage.off('pointermove', this._onPointerMove);
            this.app.stage.off('pointerup', this._onPointerUp);
            this.app.stage.off('pointerupoutside', this._onPointerUp);
            this.app.destroy(true, { children: true });
            this.app = null;
        }
        this.host.innerHTML = '';
        this.handles = [];
        this.partGraphics.clear();
    }

    _layout() {
        if (!this.app || !this.petRoot) return;
        this.petRoot.x = this.app.screen.width / 2;
        this.petRoot.y = this.app.screen.height / 2;
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
        if (!this.stage) return;

        this.stage.removeChildren();
        this.handles.forEach((h) => h.destroy());
        this.handles = [];
        this.partGraphics.clear();

        this.petRoot = new Container();
        this.stage.addChild(this.petRoot);
        this._layout();

        this.bodyG = new Graphics();
        this.petRoot.addChild(this.bodyG);

        for (const part of this.model.parts) {
            const g = new Graphics();
            this.petRoot.addChild(g);
            this.partGraphics.set(part.id, g);
        }

        this.eyeG = new Graphics();
        this.petRoot.addChild(this.eyeG);

        this.originG = new Graphics();
        this.petRoot.addChild(this.originG);

        this._updateAnchor();
        this._redrawAll();
        this._refreshHandles();
    }

    _updateAnchor() {
        this._anchor = computeBodyAnchor(this.model.body);
    }

    /** Design-space → editor canvas (same layout as in-game at reference mob size). */
    _toLocal(p) {
        return toLocalShapePoint(p, this._anchor, this._previewScale);
    }

    _toLocalPoints(points) {
        return toLocalShapePoints(points, this._anchor, this._previewScale);
    }

    _localToDesign(lx, ly) {
        const s = this._previewScale || 1;
        return {
            x: lx / s + this._anchor.x,
            y: ly / s + this._anchor.y,
        };
    }

    _redrawAll() {
        this._updateAnchor();

        drawLocalBezierShape(
            this.bodyG,
            this._toLocalPoints(this.model.body),
            MOB_BODY_FILL_COLOR,
            0,
            0
        );

        for (const part of this.model.parts) {
            const g = this.partGraphics.get(part.id);
            if (!g) continue;
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
                g.circle(local.x, local.y, (part.r ?? 12) * this._previewScale)
                    .fill({ color: toPixiColor(part.color, 0xffaa44), alpha: 0.9 });
            }
        }

        const eyeLocal = this._toLocal(this.model.eye);
        const eyeMul = this.model.eye.size ?? 1;
        drawLocalEyeWedge(
            this.eyeG,
            eyeLocal.x,
            eyeLocal.y,
            eyeWedgeScaleForMobSize(REFERENCE_MOB_SIZE, eyeMul),
            0xffffff
        );

        this.originG.clear();
        this.originG.moveTo(-12, 0).lineTo(12, 0);
        this.originG.moveTo(0, -12).lineTo(0, 12);
        this.originG.stroke({ width: 1, color: 0xffffff, alpha: 0.2 });
    }

    _refreshHandles() {
        this.handles.forEach((h) => h.destroy());
        this.handles = [];

        if (this.activePart === 'body') {
            this._createBezierHandles(this.model.body, (i, d) => {
                this.model.body[i].x = d.x;
                this.model.body[i].y = d.y;
                this._redrawAll();
            });
        } else if (this.activePart === 'eye') {
            this._createPointHandle(this.model.eye, 0xffcc00, (d) => {
                this.model.eye.x = d.x;
                this.model.eye.y = d.y;
                this._redrawAll();
            });
            const sizeHandle = {
                x: this.model.eye.x + EYE_SIZE_HANDLE_RADIUS * (this.model.eye.size ?? 1),
                y: this.model.eye.y,
            };
            this._createPointHandle(sizeHandle, 0x00d4ff, (d) => {
                const dist = Math.hypot(d.x - this.model.eye.x, d.y - this.model.eye.y);
                this.model.eye.size = Math.max(
                    0.25,
                    Math.min(4, dist / EYE_SIZE_HANDLE_RADIUS)
                );
                this._redrawAll();
            });
        } else {
            const part = this.model.parts.find((p) => p.id === this.activePart);
            if (!part) return;

            if (part.type === 'bezier') {
                this._createBezierHandles(part.points, (i, d) => {
                    part.points[i].x = d.x;
                    part.points[i].y = d.y;
                    this._redrawAll();
                });
            } else if (part.type === 'circle') {
                this._createPointHandle(part, 0xffcc00, (d) => {
                    part.x = d.x;
                    part.y = d.y;
                    this._redrawAll();
                });
                const rim = { x: part.x + part.r, y: part.y };
                this._createPointHandle(rim, 0x00d4ff, (d) => {
                    part.r = Math.max(4, Math.hypot(d.x - part.x, d.y - part.y));
                    this._redrawAll();
                });
            }
        }
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
        const local = this._toLocal(designPoint);
        const h = new Graphics().circle(0, 0, 6).fill({ color });
        h.x = this.petRoot.x + local.x;
        h.y = this.petRoot.y + local.y;
        h.eventMode = 'static';
        h.cursor = 'pointer';
        h.on('pointerdown', (e) => {
            e.stopPropagation();
            this._drag = { handle: h, onDesignMove };
        });
        this.app.stage.addChild(h);
        this.handles.push(h);
    }

    _onPointerMove(e) {
        if (!this._drag || !this.petRoot) return;
        const pos = e.global;
        this._drag.handle.x = pos.x;
        this._drag.handle.y = pos.y;
        const lx = pos.x - this.petRoot.x;
        const ly = pos.y - this.petRoot.y;
        this._drag.onDesignMove(this._localToDesign(lx, ly));
        this._syncHandlePositions();
    }

    _syncHandlePositions() {
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
        if (!h) return;
        const local = this._toLocal(designPoint);
        h.x = this.petRoot.x + local.x;
        h.y = this.petRoot.y + local.y;
    }

    _syncBezierHandlePositions(points) {
        points.forEach((p, i) => this._syncHandlePosition(p, i));
    }

    _onPointerUp() {
        const hadDrag = this._drag != null;
        this._drag = null;
        if (hadDrag) this.onModelChange?.();
    }
}
