import { defineConfig } from 'electron-vite';
import type { Plugin } from 'vite';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';

function resourcesPlugin(): Plugin {
    const resourcesDir = resolve(__dirname, './src/game/resources');

    function listEntries(dir: string, prefix: string): string[] {
        const results: string[] = [];
        if (!fs.existsSync(dir)) { return results; }
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory()) {
                const sub = listEntries(path.join(dir, entry.name), prefix + entry.name + '/');
                if (sub.length > 0) { results.push(...sub); } else { results.push(prefix + entry.name + '/'); }
            } else if (entry.isFile() && entry.name.endsWith('.json')) {
                results.push(prefix + entry.name);
            }
        }
        return results;
    }

    function safeResolve(base: string, rel: string): string | null {
        const resolved = path.normalize(path.join(base, rel));
        const relative = path.relative(base, resolved);
        if (relative.startsWith('..') || path.isAbsolute(relative)) { return null; }
        return resolved;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function attachMiddleware(middlewares: any): void {
        middlewares.use('/__resources/list', (_req: unknown, res: any) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(listEntries(resourcesDir, '')));
        });

        middlewares.use('/__resources/read', (req: any, res: any) => {
            const qs = (req.url as string).includes('?') ? (req.url as string).slice((req.url as string).indexOf('?') + 1) : '';
            const filePath = new URLSearchParams(qs).get('path') ?? '';
            const target = safeResolve(resourcesDir, filePath);
            if (!target) { res.statusCode = 403; res.end(JSON.stringify({ ok: false })); return; }
            try {
                const content = fs.readFileSync(target, 'utf-8');
                res.setHeader('Content-Type', 'application/json');
                res.end(content);
            } catch { res.statusCode = 404; res.end(JSON.stringify({ ok: false })); }
        });

        middlewares.use('/__resources/write', (req: any, res: any) => {
            let body = '';
            req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
            req.on('end', () => {
                try {
                    const { filename, content } = JSON.parse(body) as { filename: string; content: string };
                    const target = safeResolve(resourcesDir, filename);
                    if (!target) { res.statusCode = 403; res.end(JSON.stringify({ ok: false })); return; }
                    fs.mkdirSync(path.dirname(target), { recursive: true });
                    fs.writeFileSync(target, content, 'utf-8');
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ ok: true }));
                } catch { res.statusCode = 500; res.end(JSON.stringify({ ok: false })); }
            });
        });

        middlewares.use('/__resources/move', (req: any, res: any) => {
            let body = '';
            req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
            req.on('end', () => {
                try {
                    const { from, to } = JSON.parse(body) as { from: string; to: string };
                    const fromTarget = safeResolve(resourcesDir, from);
                    const toTarget   = safeResolve(resourcesDir, to);
                    if (!fromTarget || !toTarget) { res.statusCode = 403; res.end(JSON.stringify({ ok: false })); return; }
                    fs.mkdirSync(path.dirname(toTarget), { recursive: true });
                    fs.renameSync(fromTarget, toTarget);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ ok: true }));
                } catch { res.statusCode = 500; res.end(JSON.stringify({ ok: false })); }
            });
        });

        middlewares.use('/__resources/mkdir', (req: any, res: any) => {
            let body = '';
            req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
            req.on('end', () => {
                try {
                    const { path: dirPath } = JSON.parse(body) as { path: string };
                    const target = safeResolve(resourcesDir, dirPath);
                    if (!target) { res.statusCode = 403; res.end(JSON.stringify({ ok: false })); return; }
                    fs.mkdirSync(target, { recursive: true });
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ ok: true }));
                } catch { res.statusCode = 500; res.end(JSON.stringify({ ok: false })); }
            });
        });

        middlewares.use('/__resources/delete', (req: any, res: any) => {
            let body = '';
            req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
            req.on('end', () => {
                try {
                    const { path: filePath } = JSON.parse(body) as { path: string };
                    const target = safeResolve(resourcesDir, filePath);
                    if (!target) { res.statusCode = 403; res.end(JSON.stringify({ ok: false })); return; }
                    const stat = fs.statSync(target);
                    if (stat.isDirectory()) { fs.rmdirSync(target); } else { fs.unlinkSync(target); }
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ ok: true }));
                } catch { res.statusCode = 500; res.end(JSON.stringify({ ok: false })); }
            });
        });
    }

    return {
        name: 'nitrate-resources',
        configureServer(server) { attachMiddleware(server.middlewares); },
        configurePreviewServer(server) { attachMiddleware(server.middlewares); },
    };
}

export default defineConfig({
    main: {
        build: {
            rollupOptions: {
                input: resolve(__dirname, 'electron/main.ts'),
            },
        },
    },
    preload: {
        build: {
            rollupOptions: {
                input: resolve(__dirname, 'electron/preload.ts'),
                output: { format: 'cjs' },
            },
        },
    },
    renderer: {
        root: resolve(__dirname, '.'),
        build: {
            rollupOptions: {
                input: resolve(__dirname, 'index.html'),
            },
        },
        plugins: [resourcesPlugin()],
        resolve: {
            alias: {
                '@Nitrate': resolve(__dirname, './src/engine/Nitrate.ts'),
            },
        },
    },
});
