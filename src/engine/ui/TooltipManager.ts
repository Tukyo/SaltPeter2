import { Input } from '../input/Input';
import { LogManager } from '../debug/LogManager';
import { NitrateProcess } from '../NitrateProcess';

/**
 * Manages a single persistent tooltip overlay. Controls call Show/Hide on hover.
 * Instantiated by UserInterfaceManager — the engine handles its lifecycle.
 *
 * ```ts
 * element.addEventListener('mouseenter', () => HintManager.Instance?.Show('Brush size in cells.'));
 * element.addEventListener('mouseleave', () => HintManager.Instance?.Hide());
 * ```
 */
export class TooltipManager extends NitrateProcess {
    public static Instance: TooltipManager | null = null;

    private readonly offset = 6;
    private readonly showDelayMs = 800;

    private readonly overlay: HTMLElement;
    private readonly textElement: HTMLElement;

    private isVisible = false;
    private showTimer: number | null = null;

    constructor() {
        super();
        this.Register();
        
        TooltipManager.Instance = this;

        this.overlay = document.createElement('div');
        this.overlay.id = 'tooltip-overlay';

        this.textElement = document.createElement('div');
        this.textElement.className = 'tooltip-text';

        this.overlay.appendChild(this.textElement);
        document.body.appendChild(this.overlay);
    }

    public Update(): void {
        if (!this.isVisible) { return; }
        const pos = Input.Instance?.GetMouseState().screen.pos;
        if (!pos) { return; }
        this.Position(pos.x, pos.y);
    }

    public Show(text: string): void {
        if (this.showTimer !== null) { window.clearTimeout(this.showTimer); }
        this.showTimer = window.setTimeout(() => {
            this.showTimer = null;
            this.textElement.textContent = text;
            this.isVisible = true;
            this.overlay.classList.add('is-visible');
        }, this.showDelayMs);
        LogManager.Instance?.Log({
            text: 'Tooltip shown.',
            options: { noisy: true, tags: ["UserInterface"] }
        });
    }

    public Hide(): void {
        if (this.showTimer !== null) {
            window.clearTimeout(this.showTimer);
            this.showTimer = null;
        }
        this.isVisible = false;
        this.overlay.classList.remove('is-visible');
        LogManager.Instance?.Log({
            text: 'Tooltip hidden.',
            options: { noisy: true, tags: ["UserInterface"] }
        });
    }

    private Position(x: number, y: number): void {
        const gap = this.offset;
        const width = this.overlay.offsetWidth;
        const height = this.overlay.offsetHeight;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = x + gap;
        let top = y + gap;

        if (left + width > viewportWidth) { left = x - width - gap; }
        if (top + height > viewportHeight) { top = y - height - gap; }
        if (top < gap) { top = gap; }
        if (left < gap) { left = gap; }

        this.overlay.style.left = left + 'px';
        this.overlay.style.top = top + 'px';
    }

    public OnDestroy(): void {
        this.overlay.remove();
        if (TooltipManager.Instance === this) {
            TooltipManager.Instance = null;
            LogManager.Instance?.Log({
                text: 'Cleared TooltipManager singleton instance.',
                options: { tags: ["UserInterface", "NitrateProcessDestroy"] }
            });
        }
    }
}
