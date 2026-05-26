import type { MaterialId } from '../../materials/definitions/MaterialIdentity';
import type { Rect2D, Vec2 } from '../../definitions/Primitives';

import { Export } from './Export';
import { MaterialQuery } from '../../materials/MaterialQuery';
import { Metadata } from '../Metadata';
import { PixelData } from '../../component/definitions/pixeldata/PixelData';
import { SimulationManager } from '../../simulation/SimulationManager';

/**
 * Reads the current simulation texture within the active selection and writes
 * a `.gameobject.json` asset and `.meta` file to the GameObjects directory.
 */
export class ExportGameObject extends Export {
    public static Instance: ExportGameObject | null = null;

    private selectionProvider: (() => Rect2D | null) | null = null;
    private anchorProvider: (() => Vec2 | null) | null = null;

    constructor() {
        super();
        ExportGameObject.Instance = this;
    }

    /** Sets the function used to retrieve the current selection rect. */
    public SetSelectionProvider(fn: () => Rect2D | null): void { this.selectionProvider = fn; }
    /** Sets the function used to retrieve the anchor position within the selection. */
    public SetAnchorProvider(fn: () => Vec2 | null): void { this.anchorProvider = fn; }

    /** Routes the output to the GameObjects directory with a `.gameobject.json` extension. */
    protected override GetFilename(go: { name: string }): string {
        return 'GameObjects/' + go.name + '.gameobject.json';
    }

    /** Reads the simulation texture within the selection rect and serialises the cell data into the PixelData component before writing to disk. @internal */
    public async Run(): Promise<void> {
        const norm = this.selectionProvider?.() ?? null;
        const anchor = this.anchorProvider?.() ?? null;
        const go = this.gameObjectProvider?.() ?? null;
        const sim = SimulationManager.Instance;
        if (!norm || !anchor || !go || !sim) { return; }

        const { pingPong, texturePixelReader } = sim;
        if (!pingPong || !texturePixelReader) { return; }

        const gridSize = pingPong.width;

        const { x1, y1, x2, y2 } = norm;
        const width = x2 - x1 + 1;
        const height = y2 - y1 + 1;

        const { data, bytesPerRow } = await texturePixelReader.ReadRegion({
            texture: pingPong.currentIdentity,
            rowStart: gridSize - 1 - y2,
            rowCount: height,
            fullWidth: gridSize,
        });

        const pixelData = go.GetComponent(PixelData);
        if (pixelData) {
            pixelData.size = { width, height };
            pixelData.pivot = { x: anchor.x - x1, y: anchor.y - y1 };
            pixelData.cells = [];

            for (let cy = y1; cy <= y2; cy++) {
                for (let cx = x1; cx <= x2; cx++) {
                    const byteOffset = (y2 - cy) * bytesPerRow + cx * 4;
                    const materialId = data[byteOffset] as MaterialId;
                    const colorVariant = MaterialQuery.DecodeColorIndex(data[byteOffset + 1]);
                    pixelData.cells.push({ pos: { x: cx - x1, y: cy - y1 }, materialId, colorVariant });
                }
            }
        }

        const meta = Metadata.Generate('gameobject', { size: { width: gridSize, height: gridSize }, pos: { x: x1, y: y1 } });
        await this.WriteFile(go, meta);
    }

    public OnDestroy(): void {
        super.OnDestroy();
        this.selectionProvider = null;
        this.anchorProvider = null;
        if (ExportGameObject.Instance === this) { ExportGameObject.Instance = null; }
    }
}
