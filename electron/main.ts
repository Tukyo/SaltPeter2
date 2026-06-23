import { app, BrowserWindow, dialog } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import { join } from 'path';
import fs from 'fs';

import { registerSavesHandlers } from './ipc/saves';
import { registerResourcesHandlers } from './ipc/resources';
import { registerScreenshotHandlers } from './ipc/screenshot';
import { registerShellHandlers } from './ipc/shell';
import { registerUserdataHandlers } from './ipc/userdata';

const resourcesDir = join(app.getAppPath(), 'src/game/resources');
const saltpeterDir = join(app.getPath('documents'), 'SaltPeter');
const saveRootDir = join(saltpeterDir, 'Saves');
const screenshotsDir = join(saltpeterDir, 'Screenshots');
const userdataDir = join(saltpeterDir, 'CustomAssets');

function warmUserDirectories(): void {
    const dirs = [
        saveRootDir,
        join(userdataDir, 'Blueprints'),
        join(userdataDir, 'GameObjects'),
    ];
    for (const dir of dirs) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function registerIpcHandlers(): void {
    registerSavesHandlers(saveRootDir);
    registerResourcesHandlers(resourcesDir);
    registerScreenshotHandlers(screenshotsDir);
    registerShellHandlers(resourcesDir, userdataDir, screenshotsDir);
    registerUserdataHandlers(userdataDir);
}

function createWindow(): void {
    const win = new BrowserWindow({
        title: `SaltPeter v${app.getVersion()}`,
        width: 1280,
        height: 800,
        fullscreen: true,
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
        if (!win) { return; }
        dialog.showMessageBox(win, {
            type: 'info',
            title: 'Update Available',
            message: `SaltPeter ${info.version} is available. Would you like to download and install it?`,
            buttons: ['Update', 'Later'],
            defaultId: 0,
            cancelId: 1,
        }).then(({ response }) => {
            if (response !== 0) { return; }
            void autoUpdater.downloadUpdate();
            if (!win.isDestroyed()) {
                win.setTitle('SaltPeter - Downloading update...');
                win.setProgressBar(0);
            }
        });
    });

    autoUpdater.on('download-progress', (progress) => {
        const win = BrowserWindow.getAllWindows()[0];
        if (!win) { return; }
        const percent = Math.round(progress.percent);
        win.setProgressBar(progress.percent / 100);
        win.setTitle(`SaltPeter - Downloading update: ${percent}%`);
    });

    autoUpdater.on('update-downloaded', () => {
        const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
        if (!win) { autoUpdater.quitAndInstall(true, true); return; }
        win.setProgressBar(-1);
        win.setTitle(`SaltPeter v${app.getVersion()}`);
        dialog.showMessageBox(win, {
            type: 'info',
            title: 'Update Ready',
            message: 'Update downloaded. Restart SaltPeter now to apply it?',
            buttons: ['Restart Now', 'Later'],
            defaultId: 0,
            cancelId: 1,
        }).then(({ response }) => {
            if (response === 0) { autoUpdater.quitAndInstall(true, true); }
        });
    });

    void autoUpdater.checkForUpdates();
}

app.whenReady().then(() => {
    warmUserDirectories();
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
