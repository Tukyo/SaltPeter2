import type { BiomeFloodFillMaterial, BiomeMaterial, BiomeStampMaterialMap } from './biome/definitions/BiomeModel';
import type { BlueprintCell } from '../component/definitions/blueprint/Blueprint';
import type { Size2D, Vec2 } from '../definitions/Primitives';

//@omitfromdocs
export interface StampCell {
    material: BiomeMaterial;
    colorIndex: number;
}

/**
 * A precomputed blueprint stamp ready for WorldGen to apply.
 * Holds a flat cell lookup keyed by content-relative index so StampPass
 * can resolve each chunk cell in O(1) without scanning blueprint.cells.
 */
export class WorldStamp {
    public readonly worldPos: Vec2;
    public readonly contentSize: Size2D;

    private readonly cellMap: Map<number, StampCell>;

    constructor(params: {
        worldPos: Vec2;
        contentSize: Size2D;
        border: number;
        cells: BlueprintCell[];
        materials: BiomeStampMaterialMap;
        seed: number;
    }) {
        this.worldPos = params.worldPos;
        this.contentSize = params.contentSize;
        this.cellMap = new Map();

        const air: StampCell = { material: { name: 'air', occupancy: 'unoccupied' }, colorIndex: 0 };

        for (let cy = 0; cy < params.contentSize.height; cy++) {
            for (let cx = 0; cx < params.contentSize.width; cx++) {
                this.cellMap.set(cy * params.contentSize.width + cx, air);
            }
        }

        const powderCells = new Set<string>();
        const liquidCells = new Set<string>();
        const colorIndexMap = new Map<string, number>();

        for (const cell of params.cells) {
            const contentX = cell.pos.x - params.border;
            const contentY = cell.pos.y - params.border;
            if (
                contentX < 0 || contentY < 0 ||
                contentX >= params.contentSize.width ||
                contentY >= params.contentSize.height
            ) { continue; }

            const key = `${contentX},${contentY}`;
            if (cell.type === 'solid') {
                this.cellMap.set(
                    contentY * params.contentSize.width + contentX,
                    { material: params.materials.solid, colorIndex: cell.colorIndex }
                );
            } else if (cell.type === 'powder') {
                powderCells.add(key);
                colorIndexMap.set(key, cell.colorIndex);
            } else if (cell.type === 'liquid') {
                liquidCells.add(key);
                colorIndexMap.set(key, cell.colorIndex);
            } else if (cell.type === 'detail' && params.materials.detail) {
                this.cellMap.set(
                    contentY * params.contentSize.width + contentX,
                    { material: params.materials.detail, colorIndex: cell.colorIndex }
                );
            }
        }

        this.ApplyFloodFill(powderCells, colorIndexMap, params.contentSize, params.materials.powder, params.seed, 0);
        this.ApplyFloodFill(liquidCells, colorIndexMap, params.contentSize, params.materials.liquid, params.seed, 1);
    }

    /** Returns the stamp cell for a world-space position, or null if outside this stamp's content bounds. @internal */
    public GetCell(worldPos: Vec2): StampCell | null {
        const contentX = worldPos.x - this.worldPos.x;
        const contentY = worldPos.y - this.worldPos.y;
        if (contentX < 0 || contentY < 0 || contentX >= this.contentSize.width || contentY >= this.contentSize.height) {
            return null;
        }
        return this.cellMap.get(contentY * this.contentSize.width + contentX) ?? null;
    }

    /** Returns true if the given chunk's top-left world position overlaps this stamp's content region. @internal */
    public OverlapsChunk(chunkWorldPos: Vec2, chunkSize: number): boolean {
        return (
            chunkWorldPos.x < this.worldPos.x + this.contentSize.width &&
            chunkWorldPos.x + chunkSize > this.worldPos.x &&
            chunkWorldPos.y < this.worldPos.y + this.contentSize.height &&
            chunkWorldPos.y + chunkSize > this.worldPos.y
        );
    }

    /**
     * BFS flood-fills connected components in the given position set.
     * Each component gets a single randomly chosen material and a deterministic
     * colorIndex derived from the component index.
     */
    private ApplyFloodFill(
        positions: Set<string>,
        colorIndexMap: Map<string, number>,
        contentSize: Size2D,
        materials: BiomeFloodFillMaterial[],
        seed: number,
        categoryOffset: number
    ): void {
        if (materials.length === 0) { return; }

        const visited = new Set<string>();
        let componentIndex = 0;

        for (const startKey of positions) {
            if (visited.has(startKey)) { continue; }

            const component: { x: number; y: number }[] = [];
            const queue: string[] = [startKey];

            while (queue.length > 0) {
                const key = queue.shift();
                if (key === undefined || visited.has(key)) { continue; }
                visited.add(key);

                const comma = key.indexOf(',');
                const x = parseInt(key.slice(0, comma), 10);
                const y = parseInt(key.slice(comma + 1), 10);
                component.push({ x, y });

                for (const neighbor of [
                    `${x - 1},${y}`, `${x + 1},${y}`,
                    `${x},${y - 1}`, `${x},${y + 1}`
                ]) {
                    if (positions.has(neighbor) && !visited.has(neighbor)) { queue.push(neighbor); }
                }
            }

            const rawSeed = (seed ^ ((componentIndex * 2654435761 + categoryOffset * 1664525) >>> 0)) >>> 0;
            let h = rawSeed;
            h = (Math.imul(h ^ (h >>> 16), 0x85ebca6b)) >>> 0;
            h = (Math.imul(h ^ (h >>> 13), 0xc2b2ae35)) >>> 0;
            h = (h ^ (h >>> 16)) >>> 0;
            const totalWeight = materials.reduce((sum, m) => sum + m.weight, 0);
            const threshold = (h / 0x100000000) * totalWeight;
            let accumulated = 0;
            let material = materials[materials.length - 1];
            for (const m of materials) {
                accumulated += m.weight;
                if (threshold < accumulated) { material = m; break; }
            }

            for (const { x, y } of component) {
                const colorIndex = colorIndexMap.get(`${x},${y}`) ?? 0;
                this.cellMap.set(y * contentSize.width + x, { material, colorIndex });
            }
            componentIndex++;
        }
    }
}
