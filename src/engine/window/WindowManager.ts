import { LogManager } from '../debug/LogManager'
import { NitrateEngine } from '../NitrateEngine';
import { NitrateProcess } from '../NitrateProcess';
import { Renderer } from '../rendering/Renderer';

/**
 * Listens for browser window resize events and drives the engine resize pipeline.
 *
 * ```ts
 * new Nitrate.WindowManager();
 * ```
 */
export class WindowManager extends NitrateProcess {
    public static Instance: WindowManager | null = null;

    private resizeHandle: number | null = null;
    private blocked: boolean = false;
    private resizing: Promise<void> | null = null;
    private readonly handleWindowResize: () => void;
    private static readonly resizeDebounce = 100;

    constructor() {
        super();
        WindowManager.Instance = this;
        this.handleWindowResize = () => { this.DoResize(); };
        window.addEventListener('resize', this.handleWindowResize);
    }

    /** 
     * Resizes the canvas and triggers the engine resize pipeline.
     * Ignored if blocked or a resize is already in flight.
     */
    private DoResize(): void {
        if (this.blocked || this.resizing) { return; }
        const renderer = Renderer.Instance?.GetWebGPU();
        if (!renderer) { return; }
        if (!renderer.Resize({ width: window.innerWidth, height: window.innerHeight })) { return; }
        LogManager.Instance?.Log({
            text: `Resize executing (${window.innerWidth}x${window.innerHeight}).`,
            options: { tags: ['Window'] }
        });
        this.resizing = NitrateEngine.Resize({ width: window.innerWidth, height: window.innerHeight })
            .finally(() => { this.resizing = null; });
    }

    /** Prevents any further resize events from being processed until UnblockResize is called. */
    public BlockResize(): void {
        this.blocked = true;
        LogManager.Instance?.Log({
            text: `Resize handler blocked.`,
            options: { tags: ['Window'] }
        });
    }

    /** Resumes resize event processing after a BlockResize call. */
    public UnblockResize(): void {
        this.blocked = false;
        LogManager.Instance?.Log({
            text: `Resize handler unblocked.`,
            options: { tags: ['Window'] }
        });
    }

    /** Schedules a resize after a short debounce. Resets the timer on each call. */
    public ScheduleResize(): void {
        if (this.blocked) { return; }
        if (this.resizeHandle !== null) { window.clearTimeout(this.resizeHandle); }
        this.resizeHandle = window.setTimeout(() => {
            this.resizeHandle = null;
            this.DoResize();
            LogManager.Instance?.Log({
                text: `Resize scheduled.`,
                options: { tags: ['Window'], noisy: true }
            });
        }, WindowManager.resizeDebounce);
    }

    public OnDestroy(): void {
        window.removeEventListener('resize', this.handleWindowResize);
        if (this.resizeHandle !== null) { window.clearTimeout(this.resizeHandle); this.resizeHandle = null; }
        if (WindowManager.Instance === this) {
            WindowManager.Instance = null;
            LogManager.Instance?.Log({
                text: 'Cleared WindowManager singleton instance.',
                options: { tags: ["Window", "NitrateProcessDestroy"] }
            });
        }
    }
}
