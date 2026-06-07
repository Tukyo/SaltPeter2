import type { AnalyticsCounts } from './Analytics';

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

    public Update(counts: AnalyticsCounts): void {
        this.el.innerHTML = `
            <div class="analytics-title">Scene Analytics</div>
            <div class="analytics-section">
                <div class="analytics-section-title">Simulation</div>
                <div class="analytics-subsection-title">Materials</div>
                ${this.renderSection(counts.simulation)}
            </div>
            <div class="analytics-section">
                <div class="analytics-section-title">GameObject</div>
                <div class="analytics-subsection-title">Materials</div>
                ${this.renderSection(counts.gameObject)}
            </div>
        `;
    }

    private renderSection(counts: Record<string, number>): string {
        const rows = Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .map(([name, count]) => `<div>${name}: ${count}</div>`)
            .join('');
        return rows || `<div class="analytics-empty">—</div>`;
    }

    public Destroy(): void {
        this.el.remove();
    }
}
