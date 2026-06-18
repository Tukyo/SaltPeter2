import { Input } from '../input/Input';
import { KeybindConfig } from '../config/KeybindConfig';
import { LogManager } from '../debug/LogManager';
import { NitrateProcess } from '../NitrateProcess';
import { NotificationManager } from '../ui/NotificationManager';
import { Renderer } from '../rendering/Renderer';

/** Captures a screenshot of the app as a PNG and writes it to the Screenshots directory. */
export class ScreenshotManager extends NitrateProcess {
    public static Instance: ScreenshotManager | null = null;

    private unsubscribeHotkey: (() => void) | null = null;

    constructor() {
        super();
        this.Register();
        
        ScreenshotManager.Instance = this;
        this.unsubscribeHotkey = Input.Instance?.OnKeyDown(
            KeybindConfig.GetConfig().screenshot.capture,
            () => { void this.Capture(); }
        ) ?? null;
    }

    /** Handles the screenshot capture. @internal */
    public async Capture(): Promise<void> {
        const canvas = Renderer.Instance?.GetWebGPU()?.canvas ?? null;
        if (!canvas) { return; }

        const domRect = canvas.getBoundingClientRect();
        const filename = `Screenshot_${Date.now()}.png`;

        try {
            await window.api.screenshot.capture(
                {
                    x: Math.round(domRect.left),
                    y: Math.round(domRect.top),
                    width: Math.round(domRect.width),
                    height: Math.round(domRect.height),
                },
                filename
            );
            LogManager.Instance?.Log({
                text: `Screenshot saved: ${filename}`,
                options: { tags: ['DataPersistence'] }
            });
            NotificationManager.Instance?.Notify({
                message: filename,
                title: 'Screenshot Saved',
                level: 'success',
                duration: 10000,
                action: { label: 'Show in folder', onClick: () => { void window.api.shell.showScreenshot(filename); } },
            });
        } catch {
            LogManager.Instance?.LogWarning({
                text: `Failed to save screenshot: ${filename}`,
                options: { tags: ['DataPersistence'] }
            });
            NotificationManager.Instance?.Notify({
                message: 'Failed to save screenshot.',
                level: 'error',
                duration: 6000,
            });
        }
    }

    public OnDestroy(): void {
        this.unsubscribeHotkey?.();
        this.unsubscribeHotkey = null;
        if (ScreenshotManager.Instance === this) {
            ScreenshotManager.Instance = null;
            LogManager.Instance?.Log({
                text: 'Cleared ScreenshotManager singleton instance.',
                options: { tags: ['DataPersistence', 'NitrateProcessDestroy'] }
            });
        }
    }
}
