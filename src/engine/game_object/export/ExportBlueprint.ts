import { Blueprint } from '../../component/definitions/blueprint/Blueprint';
import { Export } from './Export';
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

    /** Reads the full simulation texture and serialises all non-empty cells into the blueprint component before writing to disk. @internal */
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
            blueprint.cells = [];

            for (let cy = 0; cy < height; cy++) {
                for (let cx = 0; cx < width; cx++) {
                    const byteOffset = (height - 1 - cy) * bytesPerRow + cx * 4;
                    if (data[byteOffset] === 0) { continue; }
                    const colorVariant = MaterialQuery.DecodeColorIndex(data[byteOffset + 1]);
                    blueprint.cells.push({ pos: { x: cx, y: cy }, colorVariant });
                }
            }
        }

        await this.WriteFile(go, 'blueprint', { size: { width, height } });
    }

    public OnDestroy(): void {
        super.OnDestroy();
        if (ExportBlueprint.Instance === this) { ExportBlueprint.Instance = null; }
    }
}
