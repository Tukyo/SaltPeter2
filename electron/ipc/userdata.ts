import { ipcMain } from 'electron';
import { join, basename } from 'path';
import fs from 'fs';

export function registerUserdataHandlers(userdataDir: string): void {
    ipcMain.handle('userdata:label', () => basename(userdataDir));

    function safeResolve(rel: string): string | null {
        const resolved = join(userdataDir, rel);
        if (!resolved.startsWith(userdataDir)) { return null; }
        return resolved;
    }

    ipcMain.handle('userdata:list', () => {
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
        return listEntries(userdataDir, '');
    });

    ipcMain.handle('userdata:read', (_e, path: string) => {
        const target = safeResolve(path);
        if (!target) { throw new Error('Forbidden'); }
        return fs.readFileSync(target, 'utf-8');
    });

    ipcMain.handle('userdata:write', (_e, filename: string, content: string) => {
        const target = safeResolve(filename);
        if (!target) { throw new Error('Forbidden'); }
        fs.mkdirSync(join(target, '..'), { recursive: true });
        fs.writeFileSync(target, content, 'utf-8');
    });

    ipcMain.handle('userdata:move', (_e, from: string, to: string) => {
        const fromTarget = safeResolve(from);
        const toTarget = safeResolve(to);
        if (!fromTarget || !toTarget) { throw new Error('Forbidden'); }
        fs.mkdirSync(join(toTarget, '..'), { recursive: true });
        fs.renameSync(fromTarget, toTarget);
    });

    ipcMain.handle('userdata:mkdir', (_e, path: string) => {
        const target = safeResolve(path);
        if (!target) { throw new Error('Forbidden'); }
        fs.mkdirSync(target, { recursive: true });
    });

    ipcMain.handle('userdata:delete', (_e, path: string) => {
        const target = safeResolve(path);
        if (!target) { throw new Error('Forbidden'); }
        const stat = fs.statSync(target);
        if (stat.isDirectory()) { fs.rmdirSync(target); } else { fs.unlinkSync(target); }
    });

    ipcMain.handle('userdata:writeBinary', (_e, filename: string, data: Uint8Array) => {
        const target = safeResolve(filename);
        if (!target) { throw new Error('Forbidden'); }
        fs.mkdirSync(join(target, '..'), { recursive: true });
        fs.writeFileSync(target, Buffer.from(data));
    });
}
