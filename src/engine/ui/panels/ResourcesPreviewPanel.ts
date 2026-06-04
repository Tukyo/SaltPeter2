import type { PixelCell } from '../../component/definitions/pixeldata/PixelData';
import type { Size2D } from '../../definitions/Primitives';

import { CollapsiblePanel } from '../CollapsiblePanel';
import { NitrateProcess } from '../../NitrateProcess';
import { PixelDataRenderer } from '../../component/PixelDataRenderer';
import { UserInterfaceConfig } from '../../config/UserInterfaceConfig';
import { UserInterfaceManager } from '../UserInterfaceManager';

export interface ResourcesPreviewPanelParams {
    style?: Partial<CSSStyleDeclaration>;
    collapsed?: boolean;
}

export class ResourcesPreviewPanel extends NitrateProcess {
    private readonly panel: CollapsiblePanel;
    private readonly nameLabel: HTMLElement;
    private readonly placeholder: HTMLElement;
    private readonly pixelDataRenderer: PixelDataRenderer;
    private readonly previewScaleTarget = 72;

    private selectGeneration = 0;

    constructor(params?: ResourcesPreviewPanelParams) {
        super();

        const defaults = UserInterfaceConfig.GetConfig().defaults.resourcePreview;
        this.panel = new CollapsiblePanel({
            label: 'Preview',
            parent: UserInterfaceManager.Instance?.panelContent,
            collapsed: params?.collapsed ?? defaults.collapsed,
            style: { ...defaults.style, ...params?.style }
        });

        this.nameLabel = document.createElement('div');
        this.nameLabel.className = 'resource-preview-name';
        this.panel.body.appendChild(this.nameLabel);

        const canvasContainer = document.createElement('div');
        canvasContainer.id = 'preview-canvas-container';
        canvasContainer.className = 'resource-preview-canvas-container';
        this.panel.body.appendChild(canvasContainer);

        this.placeholder = document.createElement('div');
        this.placeholder.className = 'resource-preview-placeholder';
        this.placeholder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
        canvasContainer.appendChild(this.placeholder);

        this.pixelDataRenderer = new PixelDataRenderer({
            containerId: 'preview-canvas-container',
            canvasId: 'preview-canvas',
            size: { width: 1, height: 1 },
            style: { display: 'none', imageRendering: 'pixelated' },
        });
    }

    // @omitfromdocs
    public OnSelect(path: string, isUserdata: boolean): void {
        this.selectGeneration++;
        void this.LoadAndRender(path, isUserdata, this.selectGeneration);
    }

    private async LoadAndRender(path: string, isUserdata: boolean, generation: number): Promise<void> {
        const api = isUserdata ? window.api.userdata : window.api.resources;

        let content: string;
        try {
            content = await api.read(path);
        } catch {
            return;
        }
        if (generation !== this.selectGeneration) { return; }

        let data: { components?: Array<Record<string, unknown>> };
        try {
            data = JSON.parse(content) as { components?: Array<Record<string, unknown>> };
        } catch {
            return;
        }

        const pixelDataRaw = data.components?.find(c => c['type'] === 'PixelData');
        if (!pixelDataRaw) {
            this.ShowPlaceholder();
            return;
        }

        const size = pixelDataRaw['size'] as Size2D;
        const cells = pixelDataRaw['cells'] as PixelCell[];
        const scale = Math.max(1, Math.floor(this.previewScaleTarget / Math.max(size.width, size.height, 1)));

        this.nameLabel.textContent = path.split('/').pop()?.replace(/\.\w+\.json$/, '') ?? path;
        this.placeholder.style.display = 'none';
        this.pixelDataRenderer.canvas.style.display = 'block';

        this.pixelDataRenderer.Render(cells, size, scale);
    }

    private ShowPlaceholder(): void {
        this.nameLabel.textContent = '';
        this.placeholder.style.display = '';
        this.pixelDataRenderer.canvas.style.display = 'none';
    }

    public OnDestroy(): void {
        this.pixelDataRenderer.Destroy();
        this.panel.OnDestroy();
    }
}
