/**
 * Small label that shows the active debug layer.
 */
export class DebugOverlayBadge {
    private readonly element: HTMLDivElement;

    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'debug-layer-badge';
        document.getElementById('sim-container')?.appendChild(this.element);
    }

    // @omitfromdocs
    public SetLabel(text: string): void { this.element.textContent = text; }

    // @omitfromdocs
    public Show(): void { this.element.classList.add('is-visible'); }

    // @omitfromdocs
    public Hide(): void { this.element.classList.remove('is-visible'); }

    // @omitfromdocs
    public Destroy(): void { this.element.parentElement?.removeChild(this.element); }
}
