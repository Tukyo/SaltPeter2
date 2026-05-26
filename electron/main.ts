import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import { join } from 'path';
import fs from 'fs';
import { deflateSync, inflateSync } from 'zlib';

// TODO: For build this should live wherever save data is stored
const resourcesDir = join(app.getAppPath(), 'src/game/resources');
const saveRootDir = app.getPath('userData');

function safeResolve(rel: string): string | null {
    const resolved = join(resourcesDir, rel);
    if (!resolved.startsWith(resourcesDir)) { return null; }
    return resolved;
}

function safeResolveSave(relativePath: string): string | null {
    const resolved = join(saveRootDir, relativePath);
    if (!resolved.startsWith(saveRootDir)) { return null; }
    return resolved;
}

function registerIpcHandlers(): void {
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
        const toTarget   = safeResolve(to);
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
}

function createWindow(): void {
    const win = new BrowserWindow({
        title: `SaltPeter v${app.getVersion()}`,
        width: 1280,
        height: 800,
        webPreferences: {
            preload: join(__dirname, '../preload/preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    if (process.env['ELECTRON_RENDERER_URL']) {
        win.loadURL(process.env['ELECTRON_RENDERER_URL']);
    } else {
        win.loadFile(join(__dirname, '../renderer/index.html'));
    }

    if (process.env['ELECTRON_RENDERER_URL']) {
        win.webContents.openDevTools();
    }

    win.webContents.on('before-input-event', (_e, input) => {
        if (input.type === 'keyDown' && input.key === 'F12') {
            win.webContents.toggleDevTools();
        }
    });
}

function initAutoUpdater(): void {
    if (process.env['ELECTRON_RENDERER_URL'] || process.env['STEAM_APPID']) { return; }
    autoUpdater.autoDownload = false;
    autoUpdater.on('update-available', (info) => {
        const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
        dialog.showMessageBox(win, {
            type: 'info',
            title: 'Update Available',
            message: `SaltPeter ${info.version} is available. Would you like to download and install it?`,
            buttons: ['Update', 'Later'],
            defaultId: 0,
            cancelId: 1,
        }).then(({ response }) => {
            if (response === 0) { void autoUpdater.downloadUpdate(); }
        });
    });
    autoUpdater.on('update-downloaded', () => { autoUpdater.quitAndInstall(true, true); });
    void autoUpdater.checkForUpdates();
}

app.whenReady().then(() => {
    registerIpcHandlers();
    createWindow();
    initAutoUpdater();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) { createWindow(); }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') { app.quit(); }
});
