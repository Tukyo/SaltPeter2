import { Nitrate } from '@Nitrate';

type ZoneType = 'content' | 'edge' | 'dead';

export class BlueprintController extends Nitrate.NitrateProcess {
    constructor() {
        super();
        Nitrate.BrushManager.Instance?.SetMarginSize(Nitrate.BlueprintLayout.GetMarginSize());
    }

    public Update(): void {
        const mouse = Nitrate.Input.Instance?.GetMouseState();
        const canvas = Nitrate.Renderer.Instance?.GetWebGPU()?.canvas;
        const sim = Nitrate.SimulationManager.Instance?.simulationLayer;
        const brush = Nitrate.BrushManager.Instance;

        if (!mouse || !canvas || !sim || !brush) { return; }
        if (!mouse.leftDown || !mouse.canvas.isInside) { return; }

        const cellX = Math.floor(mouse.canvas.pos.x * sim.width / canvas.width);
        const cellY = Math.floor(mouse.canvas.pos.y * sim.height / canvas.height);
        const zone = this.GetZone(cellX, cellY, sim.width, sim.height);
        const variantId = brush.state.GetVariantId();
        const blueprintId = Nitrate.MaterialRegistry.Materials['blueprint'].id;
        const variantName = Nitrate.MaterialQuery.GetVariantName(blueprintId, variantId) ?? '';
        const isEdgeVariant = variantName.startsWith('edge_');

        if (zone === 'edge' && isEdgeVariant) {
            const found = this.FindZone(cellX, cellY, Nitrate.BlueprintLayout.GetEdgeZones(sim.width, sim.height));
            this.FillZone(found?.bounds ?? null);
        }
    }

    private FillZone(bounds: Nitrate.Rect2D | null): void {
        const device = Nitrate.Renderer.Instance?.GetWebGPU()?.device;
        const sim = Nitrate.SimulationManager.Instance?.simulationLayer;
        const brush = Nitrate.BrushManager.Instance;

        if (!device || !sim || !brush || !bounds) { return; }

        const materialId = brush.state.GetMaterialId() as number;
        const variantId = brush.state.GetVariantId();
        const occupancy = brush.state.GetOccupancy() === 'static' ? 2 : 1;
        const width = bounds.x2 - bounds.x1;
        const height = bounds.y2 - bounds.y1;
        const cellCount = width * height;
        const data = new Uint8Array(cellCount * 4);
        for (let i = 0; i < cellCount; i++) {
            data[i * 4 + 0] = materialId;
            data[i * 4 + 1] = 0;
            data[i * 4 + 2] = variantId;
            data[i * 4 + 3] = occupancy;
        }

        device.queue.writeTexture(
            { texture: sim.currentIdentity, origin: { x: bounds.x1, y: bounds.y1, z: 0 } },
            data,
            { bytesPerRow: width * 4 },
            { width, height, depthOrArrayLayers: 1 }
        );
    }

    private FindZone<T extends { bounds: Nitrate.Rect2D }>(cellX: number, cellY: number, zones: T[]): T | null {
        for (const zone of zones) {
            const { bounds } = zone;
            if (cellX >= bounds.x1 && cellX < bounds.x2 && cellY >= bounds.y1 && cellY < bounds.y2) { return zone; }
        }
        return null;
    }

    private GetZone(cellX: number, cellY: number, width: number, height: number): ZoneType {
        const margin = Nitrate.BlueprintLayout.GetMarginSize();
        if (cellX >= margin && cellX < width - margin && cellY >= margin && cellY < height - margin) { return 'content'; }
        if (this.FindZone(cellX, cellY, Nitrate.BlueprintLayout.GetEdgeZones(width, height))) { return 'edge'; }
        return 'dead';
    }

    public OnDestroy(): void {
        Nitrate.BrushManager.Instance?.Unblock();
        Nitrate.BrushManager.Instance?.SetMarginSize(0);
    }
}
