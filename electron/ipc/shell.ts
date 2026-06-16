import { ipcMain, shell } from 'electron';
import { join } from 'path';

export function registerShellHandlers(
    resourcesDir: string,
    userdataDir: string,
    screenshotsDir: string
): void {
    ipcMain.handle('shell:showItemInFolder', (_e, base: string, relativePath: string) => {
        const dirs: Record<string, string> = {
            resources: resourcesDir,
            userdata: userdataDir,
            screenshots: screenshotsDir,
        };
        const baseDir = dirs[base];
        if (!baseDir) { return; }
        shell.showItemInFolder(join(baseDir, relativePath));
    });
}
