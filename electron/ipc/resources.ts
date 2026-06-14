import { ipcMain } from 'electron';
import { join } from 'path';
import fs from 'fs';

export function registerResourcesHandlers(resourcesDir: string): void {
    function safeResolve(rel: string): string | null {
        const resolved = join(resourcesDir, rel);
        if (!resolved.startsWith(resourcesDir)) { return null; }
        return resolved;
    }

    ipcMain.handle('resources:list', () => {
        function listEntries(dir: string, prefix: string): string[] {
            const results: string[] = [];
            if (!fs.existsSync(dir)) { return results; }
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                if (entry.isDirectory()) {
                    const sub = listEntries(join(dir, entry.name), prefix + entry.name + '/');
                    if (sub.length > 0) { results.push(...sub); } else { results.push(prefix + entry.name + '/'); }
                } else if (entry.isFile() && entry.name.endsWith('.json')) {
                    results.push(prefix + entry.name);
                }
            }
            return results;
        }
        return listEntries(resourcesDir, '');
    });

    ipcMain.handle('resources:read', (_e, path: string) => {
        const target = safeResolve(path);
        if (!target) { throw new Error('Forbidden'); }
        return fs.readFileSync(target, 'utf-8');
    });

    ipcMain.handle('resources:write', (_e, filename: string, content: string) => {
        const target = safeResolve(filename);
        if (!target) { throw new Error('Forbidden'); }
        fs.mkdirSync(join(target, '..'), { recursive: true });
        fs.writeFileSync(target, content, 'utf-8');
    });

    ipcMain.handle('resources:move', (_e, from: string, to: string) => {
        const fromTarget = safeResolve(from);
        const toTarget = safeResolve(to);
        if (!fromTarget || !toTarget) { throw new Error('Forbidden'); }
        fs.mkdirSync(join(toTarget, '..'), { recursive: true });
        fs.renameSync(fromTarget, toTarget);
    });

    ipcMain.handle('resources:mkdir', (_e, path: string) => {
        const target = safeResolve(path);
        if (!target) { throw new Error('Forbidden'); }
        fs.mkdirSync(target, { recursive: true });
    });

    ipcMain.handle('resources:delete', (_e, path: string) => {
        const target = safeResolve(path);
        if (!target) { throw new Error('Forbidden'); }
        const stat = fs.statSync(target);
        if (stat.isDirectory()) { fs.rmdirSync(target); } else { fs.unlinkSync(target); }
    });

    ipcMain.handle('resources:writeBinary', (_e, filename: string, data: Uint8Array) => {
        const target = safeResolve(filename);
        if (!target) { throw new Error('Forbidden'); }
        fs.mkdirSync(join(target, '..'), { recursive: true });
        fs.writeFileSync(target, Buffer.from(data));
    });
}
