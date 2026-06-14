import type { BlueprintEdges } from '../../component/definitions/blueprint/Blueprint';

import { Blueprint } from '../../component/definitions/blueprint/Blueprint';
import { BlueprintLayout } from '../../component/BlueprintLayout';
import { Export } from './Export';
import { MaterialIds } from '../../materials/definitions/Materials';
import { MaterialQuery } from '../../materials/MaterialQuery';
import { SimulationManager } from '../../simulation/SimulationManager';

/**
 * Reads the full simulation texture and writes a `.blueprint.json` asset
 * and `.meta` file to the Blueprints directory.
 */
export class ExportBlueprint extends Export {
    public static Instance: ExportBlueprint | null = null;

    constructor() {
        super();
        ExportBlueprint.Instance = this;
    }

    /** Routes the output to the Blueprints directory with a `.blueprint.json` extension. */
    protected override GetFilename(go: { name: string }): string {
        return 'Blueprints/' + go.name + '.blueprint.json';
    }

    /** Serialises all non-empty cells into the blueprint component before writing to disk. @internal */
    public async Run(): Promise<void> {
        const go = this.gameObjectProvider?.() ?? null;
        const sim = SimulationManager.Instance;
        if (!go || !sim) { return; }

        const { simulationLayer, texturePixelReader } = sim;
        if (!simulationLayer || !texturePixelReader) { return; }

        const { width, height } = simulationLayer;

        const { data, bytesPerRow } = await texturePixelReader.ReadRegion({
            texture: simulationLayer.currentIdentity,
            rowStart: 0,
            rowCount: height,
            fullWidth: width,
        });

        const blueprint = go.GetComponent(Blueprint);
        if (blueprint) {
            blueprint.size = { width, height };
            blueprint.edges = this.ReadEdges(data, bytesPerRow, width, height);
            blueprint.cells = [];

            const border = BlueprintLayout.GetMarginSize();
            for (let cy = border; cy < height - border; cy++) {
                for (let cx = border; cx < width - border; cx++) {
                    const byteOffset = cy * bytesPerRow + cx * 4;
                    if (data[byteOffset] === 0) { continue; }
                    const type = this.DecodeVariantType(data[byteOffset + 2]);
                    if (!type) { continue; }
                    const colorIndex = MaterialQuery.DecodeColorIndex(data[byteOffset + 1]);
                    blueprint.cells.push({ pos: { x: cx, y: cy }, type, colorIndex });
                }
            }
        }

        await this.WriteFile(go, 'blueprint', { size: { width, height } });
    }

    /** Reads edge zone pixels from raw texture data and returns the populated edge map. */
    private ReadEdges(data: Uint8Array, bytesPerRow: number, width: number, height: number): BlueprintEdges {
        const edges: BlueprintEdges = {};
        for (const { bounds, key } of BlueprintLayout.GetEdgeZones(width, height)) {
            const byteOffset = bounds.y1 * bytesPerRow + bounds.x1 * 4;
            const variantId = data[byteOffset + 2];
            if (variantId === 0) { continue; }
            const variantName = MaterialQuery.GetVariantName(MaterialIds.blueprint, variantId);
            if (variantName) { edges[key] = variantName; }
        }
        return edges;
    }

    /** Returns the variant type name for the given variant ID, or null if unregistered. */
    private DecodeVariantType(variantId: number): string | null {
        if (variantId === 0) { return 'solid'; }
        return MaterialQuery.GetVariantName(MaterialIds.blueprint, variantId) ?? null;
    }

    public OnDestroy(): void {
        super.OnDestroy();
        if (ExportBlueprint.Instance === this) {
            ExportBlueprint.Instance = null;
        }
    }
}
