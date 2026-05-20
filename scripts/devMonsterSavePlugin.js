import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Dev-only: POST /__dev/monsters/save → patch one export in monsters.js
 */
export function devMonsterSavePlugin() {
    const monstersPath = path.resolve(process.cwd(), 'src/game/monsters.js');

    function formatShapeExportBlock(exportName, shape) {
        const bodyJson = JSON.stringify(shape.body);
        const lines = [
            `export const ${exportName} = {`,
            `    body: ${bodyJson},`,
            `    eye: {x: ${shape.eye.x}, y: ${shape.eye.y}, size: ${shape.eye.size ?? 1}}`,
        ];
        if (shape.parts?.length) {
            lines.push(`    parts: ${JSON.stringify(shape.parts)},`);
        }
        lines.push('};');
        return lines.join('\n');
    }

    return {
        name: 'dev-monster-save',
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                if (req.url !== '/__dev/monsters/save' || req.method !== 'POST') {
                    return next();
                }

                try {
                    const body = await new Promise((resolve, reject) => {
                        let data = '';
                        req.on('data', (chunk) => { data += chunk; });
                        req.on('end', () => resolve(data));
                        req.on('error', reject);
                    });
                    const { exportName, shape } = JSON.parse(body);

                    if (!exportName || !/^VOID_SHAPE(_[A-Z0-9]+)?$/.test(exportName)) {
                        res.statusCode = 400;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ error: 'Invalid exportName' }));
                        return;
                    }

                    if (!shape?.body?.length || !shape.eye) {
                        res.statusCode = 400;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ error: 'Invalid shape payload' }));
                        return;
                    }

                    const src = await fs.readFile(monstersPath, 'utf8');
                    const block = formatShapeExportBlock(exportName, shape);
                    const pattern = new RegExp(
                        `export const ${exportName} = \\{[\\s\\S]*?\\};`,
                        'm'
                    );

                    if (!pattern.test(src)) {
                        res.statusCode = 404;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ error: `Export ${exportName} not found in monsters.js` }));
                        return;
                    }

                    const nextSrc = src.replace(pattern, block);
                    await fs.writeFile(monstersPath, nextSrc, 'utf8');

                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ ok: true, exportName }));
                } catch (err) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: err.message || 'Save failed' }));
                }
            });
        },
    };
}
