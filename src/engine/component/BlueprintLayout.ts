import type { Rect2D, Size2D } from '../definitions/Primitives';

export type EdgeKey = 'N_L' | 'N_R' | 'S_L' | 'S_R' | 'W' | 'E' | 'W_T' | 'W_B' | 'E_T' | 'E_B' | 'N' | 'S';

export interface EdgeZone { bounds: Rect2D; key: EdgeKey }

/**
 * Computes pixel-space geometry for a blueprint tile's margin strip and the six seam edge zones.
 * Orientation (landscape H vs portrait V) is inferred from the tile dimensions passed to {@link GetEdgeZones}.
 */
export class BlueprintLayout {
    private static readonly marginSize: number = 4;
    /** Returns the width of the outer margin strip in cells. */
    public static GetMarginSize(): number { return this.marginSize; }

    private static readonly edgeSize: Size2D = { width: 64, height: 4 };
    /** Returns the pixel dimensions of a single edge zone rectangle. */
    public static GetEdgeSize(): Size2D { return this.edgeSize; }

    /**
     * Returns the six edge zones for a tile of the given pixel dimensions.
     * Each zone carries its {@link EdgeKey} and tile-local pixel bounds.
     */
    public static GetEdgeZones(width: number, height: number): EdgeZone[] {
        const edgeWidth = this.GetEdgeSize().width;
        const half = Math.floor(edgeWidth / 2);
        const isLandscape = width > height;
        const longDim = isLandscape ? width : height;
        const shortDim = isLandscape ? height : width;
        const cStart = longDim / 2 - this.marginSize / 2;
        const farLong = longDim - this.marginSize;
        const farShort = shortDim - this.marginSize;

        if (isLandscape) {
            const cHL = Math.round((this.marginSize + cStart) / 2);
            const cHR = Math.round((cStart + this.marginSize + farLong) / 2);
            const cV = Math.round((this.marginSize + farShort) / 2);
            return [
                { key: 'N_L', bounds: { x1: cHL - half, y1: 0, x2: cHL - half + edgeWidth, y2: this.marginSize } },
                { key: 'N_R', bounds: { x1: cHR - half, y1: 0, x2: cHR - half + edgeWidth, y2: this.marginSize } },
                { key: 'S_L', bounds: { x1: cHL - half, y1: farShort, x2: cHL - half + edgeWidth, y2: height } },
                { key: 'S_R', bounds: { x1: cHR - half, y1: farShort, x2: cHR - half + edgeWidth, y2: height } },
                { key: 'W', bounds: { x1: 0, y1: cV - half, x2: this.marginSize, y2: cV - half + edgeWidth } },
                { key: 'E', bounds: { x1: farLong, y1: cV - half, x2: width, y2: cV - half + edgeWidth } },
            ];
        } else {
            const cVT = Math.round((this.marginSize + cStart) / 2);
            const cVB = Math.round((cStart + this.marginSize + farLong) / 2);
            const cH = Math.round((this.marginSize + farShort) / 2);
            return [
                { key: 'W_T', bounds: { x1: 0, y1: cVT - half, x2: this.marginSize, y2: cVT - half + edgeWidth } },
                { key: 'W_B', bounds: { x1: 0, y1: cVB - half, x2: this.marginSize, y2: cVB - half + edgeWidth } },
                { key: 'E_T', bounds: { x1: farShort, y1: cVT - half, x2: width, y2: cVT - half + edgeWidth } },
                { key: 'E_B', bounds: { x1: farShort, y1: cVB - half, x2: width, y2: cVB - half + edgeWidth } },
                { key: 'N', bounds: { x1: cH - half, y1: 0, x2: cH - half + edgeWidth, y2: this.marginSize } },
                { key: 'S', bounds: { x1: cH - half, y1: farLong, x2: cH - half + edgeWidth, y2: height } },
            ];
        }
    }
}
