import { ipcMain } from 'electron';
import { join } from 'path';
import fs from 'fs';
import { deflateSync, inflateSync } from 'zlib';

export function registerSavesHandlers(saveRootDir: string): void {
    function safeResolveSave(relativePath: string): string | null {
        const resolved = join(saveRootDir, relativePath);
        if (!resolved.startsWith(saveRootDir)) { return null; }
        return resolved;
    }

    ipcMain.handle('saves:write', async (_e, relativePath: string, data: ArrayBuffer, compress = true) => {
        const target = safeResolveSave(relativePath);
        if (!target) { throw new Error('Forbidden'); }
        await fs.promises.mkdir(join(target, '..'), { recursive: true });
        const bytes = Buffer.from(data);
        await fs.promises.writeFile(target, compress ? deflateSync(bytes) : bytes);
    });

    ipcMain.handle('saves:read', async (_e, relativePath: string, compress = true) => {
        const target = safeResolveSave(relativePath);
        if (!target) { return null; }
        try {
            const buf = await fs.promises.readFile(target);
            if (!compress) {
                return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
            }
            const inflated = inflateSync(buf);
            return inflated.buffer.slice(inflated.byteOffset, inflated.byteOffset + inflated.byteLength);
        } catch { return null; }
    });

    ipcMain.handle('saves:exists', async (_e, relativePath: string) => {
        const target = safeResolveSave(relativePath);
        if (!target) { return false; }
        try { await fs.promises.access(target); return true; } catch { return false; }
    });

    ipcMain.handle('saves:delete', async (_e, relativePath: string) => {
        const target = safeResolveSave(relativePath);
        if (!target) { throw new Error('Forbidden'); }
        await fs.promises.unlink(target);
    });

    ipcMain.handle('saves:deleteDir', async (_e, relativePath: string) => {
        const target = safeResolveSave(relativePath);
        if (!target || target === saveRootDir) { throw new Error('Forbidden'); }
        await fs.promises.rm(target, { recursive: true, force: true });
    });
}
