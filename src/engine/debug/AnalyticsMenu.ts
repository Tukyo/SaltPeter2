/**
 * DOM overlay that displays per-material cell counts from the analytics pass.
 * @internal
 */
export class AnalyticsMenu {
    private readonly el: HTMLDivElement;

    constructor() {
        this.el = document.createElement('div');
        this.el.className = 'analytics-overlay';
        document.body.appendChild(this.el);
    }

    public Update(counts: Record<string, number>): void {
        this.el.innerHTML = Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .map(([name, count]) => `<div>${name}: ${count}</div>`)
            .join('');
    }

    public Destroy(): void {
        this.el.remove();
    }
}
