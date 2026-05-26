import type { BrushMode, BrushShape, BrushType } from './BrushTypes';
import type { MaterialId, MaterialOccupancy } from '../materials/definitions/MaterialIdentity';

import type { Color } from '../definitions/Primitives';
import { LogManager } from '../debug/LogManager';

/** Provides the state of the brush. */
export class BrushState {
    private materialId: MaterialId = 0;
    /** Returns the active material ID. */
    public GetMaterialId(): MaterialId { return this.materialId; }
    /** Sets the active material ID. */
    public SetMaterialId(value: MaterialId): void {
        this.materialId = value;
        LogManager.Instance?.Log({ text: `materialId → ${value}`, options: { tags: ['Brush'] } });
    }

    private size: number = 1;
    /** Returns the brush radius in simulation cells. */
    public GetSize(): number { return this.size; }
    /** Sets the brush radius in simulation cells. */
    public SetSize(value: number): void {
        this.size = value;
        LogManager.Instance?.Log({ text: `size → ${value}`, options: { tags: ['Brush'] } });
    }

    private density: number = 1;
    /** Returns the brush density (0–1 fill probability per cell). */
    public GetDensity(): number { return this.density; }
    /** Sets the brush density (0–1 fill probability per cell). */
    public SetDensity(value: number): void {
        this.density = value;
        LogManager.Instance?.Log({ text: `density → ${value}`, options: { tags: ['Brush'] } });
    }

    private mode: BrushMode = 'draw';
    /** Returns the current brush mode (draw or erase). */
    public GetMode(): BrushMode { return this.mode; }
    /** Sets the brush mode (draw or erase). */
    public SetMode(value: BrushMode): void {
        this.mode = value;
        LogManager.Instance?.Log({ text: `mode → ${value}`, options: { tags: ['Brush'] } });
    }

    private shape: BrushShape = 'circle';
    /** Returns the current brush shape (circle or square). */
    public GetShape(): BrushShape { return this.shape; }
    /** Sets the brush shape (circle or square). */
    public SetShape(value: BrushShape): void {
        this.shape = value;
        LogManager.Instance?.Log({ text: `shape → ${value}`, options: { tags: ['Brush'] } });
    }

    private type: BrushType = 'noise';
    /** Returns the brush stroke type (noise or palette). */
    public GetType(): BrushType { return this.type; }
    /** Sets the brush stroke type (noise or palette). */
    public SetType(value: BrushType): void {
        this.type = value;
        LogManager.Instance?.Log({ text: `type → ${value}`, options: { tags: ['Brush'] } });
    }

    private color: number = 0;
    /** Returns the selected palette color index for the current stroke. */
    public GetColor(): number { return this.color; }
    /** Sets the palette color index for the current stroke. */
    public SetColor(value: number): void {
        this.color = value;
        LogManager.Instance?.Log({ text: `color → ${value}`, options: { tags: ['Brush'] } });
    }

    private variantId: number = 0;
    /** Returns the active material variant ID (0 = no variant). */
    public GetVariantId(): number { return this.variantId; }
    /** Sets the active material variant ID (0 = no variant). */
    public SetVariantId(value: number): void {
        this.variantId = value;
        LogManager.Instance?.Log({ text: `variantId → ${value}`, options: { tags: ['Brush'] } });
    }

    private occupancy: MaterialOccupancy = 'dynamic';
    /** Returns whether placed cells are dynamic (simulated) or static. */
    public GetOccupancy(): MaterialOccupancy { return this.occupancy; }
    /** Sets whether placed cells are dynamic (simulated) or static. */
    public SetOccupancy(value: MaterialOccupancy): void {
        this.occupancy = value;
        LogManager.Instance?.Log({ text: `occupancy → ${value}`, options: { tags: ['Brush'] } });
    }

    private snap: boolean = false;
    /** Returns whether brush placement is snapped to the simulation grid. */
    public GetSnap(): boolean { return this.snap; }
    /** Sets whether brush placement is snapped to the simulation grid. */
    public SetSnap(value: boolean): void {
        this.snap = value;
        LogManager.Instance?.Log({ text: `snap → ${value}`, options: { tags: ['Brush'] } });
    }

    private paletteColors: Color[] = [];
    /** Returns the current palette color array for the active material or variant. */
    public GetPaletteColors(): ReadonlyArray<Color> { return this.paletteColors; }
    /** Sets the palette color array for the active material or variant. */
    public SetPaletteColors(colors: Color[]): void {
        this.paletteColors = [...colors];
        LogManager.Instance?.Log({ text: `paletteColors → ${colors.length} colors`, options: { tags: ['Brush'] } });
    }
}
