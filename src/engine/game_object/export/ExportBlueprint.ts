import { Blueprint } from '../../component/definitions/blueprint/Blueprint';
import { Export } from './Export';
import { MaterialVisualSchema } from '../../materials/MaterialVisualSchema';
import { Metadata } from '../Metadata';
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

        const { pingPong, texturePixelReader } = sim;
        if (!pingPong || !texturePixelReader) { return; }

        const { width, height } = pingPong;
        const colorsPerMaterial = MaterialVisualSchema.GetColorsPerMaterial();

        const { data, bytesPerRow } = await texturePixelReader.ReadRegion({
            texture: pingPong.currentIdentity,
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
                    const colorVariant = Math.floor((data[byteOffset + 1] / 255) * colorsPerMaterial);
                    blueprint.cells.push({ pos: { x: cx, y: cy }, colorVariant });
                }
            }
        }

        const meta = Metadata.Generate('blueprint', { size: { width, height } });
        await this.WriteFile(go, meta);
    }

    public OnDestroy(): void {
        super.OnDestroy();
        if (ExportBlueprint.Instance === this) { ExportBlueprint.Instance = null; }
    }
}
