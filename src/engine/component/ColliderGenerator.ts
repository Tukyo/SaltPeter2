import type { PixelCell } from "./definitions/pixeldata/PixelData";
import type { Size2D, Vec2 } from "../definitions/Primitives";

/** Generates colliders for GameObjects. */
export class ColliderGenerator {
    /** Returns the integer cell positions of all outermost filled cells in a PixelBody. @internal */
    public static BuildPixelBodyBoundary(cells: PixelCell[]): Vec2[] {
        const filled = cells.filter(c => c.materialId !== 0);
        if (filled.length === 0) { return []; }

        const cellSet = new Set<string>();
        for (const cell of filled) { cellSet.add(`${cell.pos.x},${cell.pos.y}`); }
        const has = (x: number, y: number) => cellSet.has(`${x},${y}`);

        const boundary: Vec2[] = [];
        for (const cell of filled) {
            const { x, y } = cell.pos;
            const isOnBoundary =
                !has(x, y - 1) || !has(x, y + 1) ||
                !has(x - 1, y) || !has(x + 1, y);
            if (isOnBoundary) { boundary.push({ x, y }); }
        }
        return boundary;
    }

    /** Returns the integer cell positions of all cells that lie within a box collider. @internal */
    public static BuildBoxBoundary(offset: Vec2, size: Size2D): Vec2[] {
        const halfW = size.width  / 2;
        const halfH = size.height / 2;

        const minX = Math.floor(offset.x - halfW);
        const maxX = Math.ceil(offset.x  + halfW) - 1;
        const minY = Math.floor(offset.y - halfH);
        const maxY = Math.ceil(offset.y  + halfH) - 1;

        const boundary: Vec2[] = [];

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const onEdge =
                    x === minX || x === maxX ||
                    y === minY || y === maxY;
                if (onEdge) { boundary.push({ x, y }); }
            }
        }
        return boundary;
    }

    /** Returns the integer cell positions of all cells that lie on the circumference of a circle collider. @internal */
    public static BuildCircleBoundary(offset: Vec2, radius: number): Vec2[] {
        const cx = Math.round(offset.x);
        const cy = Math.round(offset.y);
        const r  = Math.round(radius);

        const seen = new Set<string>();
        const boundary: Vec2[] = [];
        const add = (x: number, y: number) => {
            const k = `${x},${y}`;
            if (!seen.has(k)) { seen.add(k); boundary.push({ x, y }); }
        };

        // Bresenham circle — 8-way symmetry
        let x = 0;
        let y = r;
        let d = 3 - 2 * r;
        while (x <= y) {
            add(cx + x, cy + y); add(cx - x, cy + y);
            add(cx + x, cy - y); add(cx - x, cy - y);
            add(cx + y, cy + x); add(cx - y, cy + x);
            add(cx + y, cy - x); add(cx - y, cy - x);
            if (d < 0) { d += 4 * x + 6; }
            else { d += 4 * (x - y) + 10; y--; }
            x++;
        }
        return boundary;
    }
}
