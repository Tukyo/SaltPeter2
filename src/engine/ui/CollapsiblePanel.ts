import { NitrateProcess } from "../NitrateProcess";

export interface CollapsiblePanelParams {
    label?: string;
    parent?: HTMLElement;
    collapsed?: boolean;
    style?: Partial<CSSStyleDeclaration>;
}

/**
 * Creates a collapsible, resizable, draggable UI panel and appends it to the provided parent element.
 *
 * Specific panels are created via their respective classes, and use this parent class to instantiate.
 */
export class CollapsiblePanel extends NitrateProcess {
    private static readonly snapDistance = 8;
    private static readonly snapGapDistance = 32;
    private static readonly snapPadding = 8;
    private static readonly offscreenPadding = 14;
    private static readonly columnGap = 8;
    private static reflowTimer: number | null = null;

    private readonly section: HTMLElement;
    private readonly header: HTMLButtonElement;
    public readonly body: HTMLElement;
    private readonly resizeHandleLeft: HTMLElement;
    private readonly resizeHandleRight: HTMLElement;
    private storedHeight: string = '';

    private readonly onWindowResize = () => { CollapsiblePanel.ScheduleReflow(); };

    constructor(params: CollapsiblePanelParams) {
        super();

        const { label, parent, collapsed = false, style } = params;

        this.section = document.createElement('section');
        this.section.className = 'ui-panel';

        if (style) {
            Object.assign(this.section.style, style);
            this.storedHeight = this.section.style.height;
            if (style.right && !style.left) {
                this.section.dataset['rightAnchor'] = style.right;
            }
        }

        this.header = document.createElement('button');
        this.header.className = 'panel-header';
        this.header.type = 'button';
        this.header.textContent = label ?? 'No Label Provided';

        this.body = document.createElement('div');
        this.body.className = 'panel-body';

        this.resizeHandleLeft = document.createElement('div');
        this.resizeHandleLeft.className = 'panel-resize-handle panel-resize-handle-left';

        this.resizeHandleRight = document.createElement('div');
        this.resizeHandleRight.className = 'panel-resize-handle panel-resize-handle-right';

        const resizeHandleContainer = document.createElement('div');
        resizeHandleContainer.className = 'panel-resize-handles';
        resizeHandleContainer.appendChild(this.resizeHandleLeft);
        resizeHandleContainer.appendChild(this.resizeHandleRight);

        this.section.appendChild(this.header);
        this.section.appendChild(this.body);
        this.section.appendChild(resizeHandleContainer);
        parent?.appendChild(this.section);

        if (this.section.style.right && !this.section.style.left) {
            this.section.style.left = `${this.section.getBoundingClientRect().left}px`;
            this.section.style.right = '';
        }

        window.addEventListener('resize', this.onWindowResize);
        this.WireHeaderDrag();
        this.WireResizeHandle(this.resizeHandleLeft, -1);
        this.WireResizeHandle(this.resizeHandleRight, 1);
        this.SetCollapsed(collapsed);
    }

    /** Returns true if the panel is currently collapsed. */
    public IsCollapsed(): boolean { return this.section.classList.contains('is-collapsed'); }

    /** Sets the collapsed state of the panel. Stashes and restores height around collapse. */
    public SetCollapsed(collapsed: boolean): void {
        if (this.IsCollapsed() === collapsed) { return; }

        const oldRect = this.section.getBoundingClientRect();

        this.section.classList.toggle('is-collapsed', collapsed);
        this.header.setAttribute('aria-expanded', String(!collapsed));

        if (collapsed) {
            this.storedHeight = this.section.style.height;
            this.section.style.height = '';
        } else {
            this.section.style.height = this.storedHeight;
        }

        const delta = this.section.offsetHeight - oldRect.height;
        if (delta !== 0) {
            CollapsiblePanel.PushPanelsInColumn(this.section, oldRect, delta);
        }
    }

    private static PushPanelsInColumn(
        source: HTMLElement,
        sourceOldRect: DOMRect,
        delta: number
    ): void {
        const panels = Array.from(document.querySelectorAll<HTMLElement>('.ui-panel'))
            .filter(el => el !== source);

        const snapshots = panels.map(el => {
            const rect = el.getBoundingClientRect();
            const inlineTop = parseFloat(el.style.top);
            return {
                el,
                rect,
                styleTop: Number.isNaN(inlineTop) ? rect.top : inlineTop,
                pushed: false,
            };
        });

        snapshots.sort((a, b) => a.rect.top - b.rect.top);

        const pushers: Array<{ left: number; right: number; bottom: number; delta: number }> = [{
            left: sourceOldRect.left,
            right: sourceOldRect.right,
            bottom: sourceOldRect.bottom,
            delta,
        }];

        for (const snap of snapshots) {
            if (snap.pushed) { continue; }

            for (const pusher of pushers) {
                const xOverlap = Math.min(snap.rect.right, pusher.right)
                    - Math.max(snap.rect.left, pusher.left) >= 8;
                const isBelow = snap.rect.top >= pusher.bottom;

                if (xOverlap && isBelow) {
                    const newTop = snap.styleTop + pusher.delta;
                    const offScreen = newTop + snap.rect.height > window.innerHeight;

                    if (offScreen) {
                        const panelCenter = (snap.rect.left + snap.rect.right) / 2;
                        const onRightSide = panelCenter > window.innerWidth / 2;
                        const wrapLeft = onRightSide
                            ? snap.rect.left - snap.rect.width - CollapsiblePanel.offscreenPadding
                            : snap.rect.right + CollapsiblePanel.offscreenPadding;
                        snap.el.style.left = `${wrapLeft}px`;
                        snap.el.style.right = '';
                        snap.el.style.top = `${CollapsiblePanel.offscreenPadding}px`;
                    } else {
                        snap.el.style.top = `${newTop}px`;
                        pushers.push({
                            left: snap.rect.left,
                            right: snap.rect.right,
                            bottom: snap.rect.bottom,
                            delta: pusher.delta,
                        });
                    }

                    snap.pushed = true;
                    break;
                }
            }
        }
    }

    /** Adds a new section to the panel body. Auto-hides if no content is appended synchronously. */
    public AddSection(label?: string): HTMLElement {
        const section = document.createElement('section');
        section.className = 'panel-section';
        if (label) {
            const title = document.createElement('h3');
            title.textContent = label;
            section.appendChild(title);
        }
        this.body.appendChild(section);
        queueMicrotask(() => {
            const hasContent = label ? section.children.length > 1 : section.children.length > 0;
            if (!hasContent) { section.style.display = 'none'; }
        });
        return section;
    }

    private SnapPosition(top: number, left: number): { top: number; left: number } {
        const width = this.section.offsetWidth;
        const height = this.section.offsetHeight;
        const right = left + width;
        const bottom = top + height;

        const others = Array.from(
            document.querySelectorAll<HTMLElement>('.ui-panel')
        ).filter(el => el !== this.section);

        let snappedLeft = left;
        let snappedTop = top;
        let bestDX = CollapsiblePanel.snapDistance + 1;
        let bestDY = CollapsiblePanel.snapDistance + 1;

        const gap = CollapsiblePanel.snapPadding;

        for (const panel of others) {
            const rect = panel.getBoundingClientRect();

            // flush X: my left/right aligns with their left/right
            // padded X: my right docks beside their left (and vice versa)
            for (const [myEdge, snapTo, isLeftEdge, threshold] of [
                [left,  rect.left,        true,  CollapsiblePanel.snapDistance],
                [left,  rect.right,       true,  CollapsiblePanel.snapDistance],
                [right, rect.left,        false, CollapsiblePanel.snapDistance],
                [right, rect.right,       false, CollapsiblePanel.snapDistance],
                [right, rect.left - gap,  false, CollapsiblePanel.snapGapDistance],
                [left,  rect.right + gap, true,  CollapsiblePanel.snapGapDistance],
            ] as [number, number, boolean, number][]) {
                const d = Math.abs(myEdge - snapTo);
                if (d < bestDX && d <= threshold) {
                    bestDX = d;
                    snappedLeft = isLeftEdge ? snapTo : snapTo - width;
                }
            }

            // flush Y: my top/bottom aligns with their top/bottom
            // padded Y: my bottom docks above their top (and vice versa)
            for (const [myEdge, snapTo, isTopEdge, threshold] of [
                [top,    rect.top,         true,  CollapsiblePanel.snapDistance],
                [top,    rect.bottom,      true,  CollapsiblePanel.snapDistance],
                [bottom, rect.top,         false, CollapsiblePanel.snapDistance],
                [bottom, rect.bottom,      false, CollapsiblePanel.snapDistance],
                [bottom, rect.top - gap,   false, CollapsiblePanel.snapGapDistance],
                [top,    rect.bottom + gap, true, CollapsiblePanel.snapGapDistance],
            ] as [number, number, boolean, number][]) {
                const d = Math.abs(myEdge - snapTo);
                if (d < bestDY && d <= threshold) {
                    bestDY = d;
                    snappedTop = isTopEdge ? snapTo : snapTo - height;
                }
            }
        }

        return {
            left: bestDX <= CollapsiblePanel.snapDistance ? snappedLeft : left,
            top: bestDY <= CollapsiblePanel.snapDistance ? snappedTop : top,
        };
    }

    private WireHeaderDrag(): void {
        let hasDragged = false;

        this.header.addEventListener('click', () => {
            if (hasDragged) { hasDragged = false; return; }
            this.SetCollapsed(!this.IsCollapsed());
        });

        this.header.addEventListener('mousedown', (e) => {
            if (e.button !== 0) { return; }
            hasDragged = false;

            const startX = e.clientX;
            const startY = e.clientY;
            const startTop = parseFloat(this.section.style.top) || 0;
            const startLeft = parseFloat(this.section.style.left) || 0;

            const onMouseMove = (moveEvent: MouseEvent) => {
                const deltaX = moveEvent.clientX - startX;
                const deltaY = moveEvent.clientY - startY;
                if (!hasDragged && Math.abs(deltaX) < 4 && Math.abs(deltaY) < 4) { return; }
                if (!hasDragged) {
                    this.section.parentElement?.appendChild(this.section);
                }
                hasDragged = true;
                this.section.classList.add('is-dragging');
                const snapped = this.SnapPosition(startTop + deltaY, startLeft + deltaX);
                this.section.style.top = `${snapped.top}px`;
                this.section.style.left = `${snapped.left}px`;
            };

            const onMouseUp = () => {
                this.section.classList.remove('is-dragging');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    private SnapResize(
        top: number, left: number, width: number, height: number, widthDirection: 1 | -1
    ): { left: number; width: number; height: number } {
        const right = left + width;
        const bottom = top + height;
        const gap = CollapsiblePanel.snapPadding;

        const others = Array.from(document.querySelectorAll<HTMLElement>('.ui-panel'))
            .filter(el => el !== this.section);

        let snappedXEdge = widthDirection === 1 ? right : left;
        let snappedBottom = bottom;
        let bestDX = CollapsiblePanel.snapDistance + 1;
        let bestDY = CollapsiblePanel.snapDistance + 1;

        for (const panel of others) {
            const rect = panel.getBoundingClientRect();

            const xCandidates: [number, number][] = widthDirection === 1
                ? [[right, rect.left], [right, rect.right], [right, rect.left - gap]]
                : [[left, rect.left], [left, rect.right], [left, rect.right + gap]];

            const thresholds = [
                CollapsiblePanel.snapDistance,
                CollapsiblePanel.snapDistance,
                CollapsiblePanel.snapGapDistance,
            ];

            for (let i = 0; i < xCandidates.length; i++) {
                const [myEdge, snapTo] = xCandidates[i];
                const d = Math.abs(myEdge - snapTo);
                if (d < bestDX && d <= thresholds[i]) { bestDX = d; snappedXEdge = snapTo; }
            }

            for (const [snapTo, threshold] of [
                [rect.top,        CollapsiblePanel.snapDistance],
                [rect.bottom,     CollapsiblePanel.snapDistance],
                [rect.top - gap,  CollapsiblePanel.snapGapDistance],
            ] as [number, number][]) {
                const d = Math.abs(bottom - snapTo);
                if (d < bestDY && d <= threshold) { bestDY = d; snappedBottom = snapTo; }
            }
        }

        const finalXEdge = bestDX <= CollapsiblePanel.snapDistance ? snappedXEdge : (widthDirection === 1 ? right : left);
        const finalBottom = bestDY <= CollapsiblePanel.snapDistance ? snappedBottom : bottom;

        return {
            left: widthDirection === 1 ? left : finalXEdge,
            width: widthDirection === 1 ? finalXEdge - left : right - finalXEdge,
            height: finalBottom - top,
        };
    }

    /**
     * widthDirection: 1 = drag right to widen (bottom-right), -1 = drag left to widen (bottom-left)
     */
    private WireResizeHandle(handle: HTMLElement, widthDirection: 1 | -1): void {
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.section.parentElement?.appendChild(this.section);
            const startX = e.clientX;
            const startY = e.clientY;
            const startRect = this.section.getBoundingClientRect();

            const onMouseMove = (moveEvent: MouseEvent) => {
                const deltaX = moveEvent.clientX - startX;
                const deltaY = moveEvent.clientY - startY;
                const rawWidth = startRect.width + deltaX * widthDirection;
                const rawLeft = widthDirection === -1 ? startRect.left + deltaX : startRect.left;
                const snapped = this.SnapResize(startRect.top, rawLeft, rawWidth, startRect.height + deltaY, widthDirection);
                this.section.style.width = `${snapped.width}px`;
                this.section.style.height = `${snapped.height}px`;
                if (widthDirection === -1) {
                    this.section.style.right = '';
                    this.section.style.left = `${snapped.left}px`;
                }
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                const heightDelta = this.section.offsetHeight - startRect.height;
                if (Math.abs(heightDelta) > 1) {
                    CollapsiblePanel.PushPanelsInColumn(this.section, startRect, heightDelta);
                }
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    private static ScheduleReflow(): void {
        if (CollapsiblePanel.reflowTimer !== null) { window.clearTimeout(CollapsiblePanel.reflowTimer); }
        CollapsiblePanel.reflowTimer = window.setTimeout(() => {
            CollapsiblePanel.reflowTimer = null;
            CollapsiblePanel.ReflowPanels();
        }, 0);
    }

    private static ReflowPanels(): void {
        const padding = CollapsiblePanel.offscreenPadding;
        const gap = CollapsiblePanel.columnGap;

        const all = Array.from(document.querySelectorAll<HTMLElement>('.ui-panel'));
        if (all.length === 0) { return; }

        for (const panel of all) {
            const rawAnchor = panel.dataset['rightAnchor'];
            if (rawAnchor !== undefined) {
                panel.style.left = `${window.innerWidth - panel.offsetWidth - parseFloat(rawAnchor)}px`;
            }
        }

        const rightGroup = all.filter(p => {
            const left = parseFloat(p.style.left) || 0;
            return left + p.offsetWidth / 2 > window.innerWidth / 2;
        });
        const leftGroup = all.filter(p => !rightGroup.includes(p));

        rightGroup.sort((a, b) => (parseFloat(a.style.top) || 0) - (parseFloat(b.style.top) || 0));
        if (rightGroup.length > 0) {
            const anchorRight = Math.max(...rightGroup.map(p => (parseFloat(p.style.left) || 0) + p.offsetWidth));
            let columnRightEdge = anchorRight;
            let currentTop = padding;
            for (const panel of rightGroup) {
                const w = panel.offsetWidth;
                const h = panel.offsetHeight;
                if (currentTop !== padding && currentTop + h > window.innerHeight - padding) {
                    columnRightEdge -= w + gap;
                    currentTop = padding;
                }
                panel.style.left = `${columnRightEdge - w}px`;
                panel.style.top = `${currentTop}px`;
                currentTop += h + gap;
            }
        }

        leftGroup.sort((a, b) => (parseFloat(a.style.top) || 0) - (parseFloat(b.style.top) || 0));
        if (leftGroup.length > 0) {
            const anchorLeft = Math.min(...leftGroup.map(p => parseFloat(p.style.left) || 0));
            let columnLeftEdge = anchorLeft;
            let currentTop = padding;
            for (const panel of leftGroup) {
                const w = panel.offsetWidth;
                const h = panel.offsetHeight;
                if (currentTop !== padding && currentTop + h > window.innerHeight - padding) {
                    columnLeftEdge += w + gap;
                    currentTop = padding;
                }
                panel.style.left = `${columnLeftEdge}px`;
                panel.style.top = `${currentTop}px`;
                currentTop += h + gap;
            }
        }
    }

    public OnDestroy(): void {
        window.removeEventListener('resize', this.onWindowResize);
        this.section.remove();
    }
}
