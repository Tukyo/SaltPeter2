import { ipcMain } from 'electron';
import { join } from 'path';
import fs from 'fs';

export function registerScreenshotHandlers(screenshotsDir: string): void {
    ipcMain.handle('screenshot:capture', async (
        event,
        rect: { x: number; y: number; width: number; height: number },
        filename: string
    ) => {
        const image = await event.sender.capturePage(rect);
        fs.mkdirSync(screenshotsDir, { recursive: true });
        fs.writeFileSync(join(screenshotsDir, filename), image.toPNG());
    });
}
