import type { Blueprint } from '../component/definitions/blueprint/Blueprint';
import type { BiomeStampMaterialMap } from './biome/definitions/BiomeModel';
import type { ChunkAddress } from './chunk/ChunkData';

import { BiomeRegistry } from './biome/BiomeRegistry';
import { BlueprintQuery } from '../component/BlueprintQuery';
import { ChunkData } from './chunk/ChunkData';
import { LogManager } from '../debug/LogManager';
import { WorldMap } from './WorldMap';
import { WorldStamp } from './WorldStamp';


type TemplateJson = { name: string; components: Array<{ type: string } & Record<string, unknown>> };

//@omitfromdocs
export interface BlueprintPlacement {
    readonly blueprint: Blueprint;
    readonly stamp: WorldStamp;
    readonly chunkX: number;
    readonly chunkY: number;
}

/** Manages placed blueprint records and builds stamps for WorldGen. */
export class WorldStampRegistry {
    private static readonly blueprintBorder: number = 4; // TODO: Remove this

    private static horizontalTemplates: Blueprint[] | null = null;
    private static verticalTemplates: Blueprint[] | null = null;

    private readonly records: BlueprintPlacement[] = [];
    /** Returns all blueprint placement records in the StampRegistry. */
    public GetRecords(): ReadonlyArray<BlueprintPlacement> { return this.records; }

    /** Loads all blueprint templates — bundled resources and user data — and separates them into H and V lists. @internal */
    public static async LoadTemplates(): Promise<void> {
        const horizontal: Blueprint[] = [];
        const vertical: Blueprint[] = [];

        const modules = import.meta.glob<TemplateJson>(
            '/src/game/resources/Blueprints/*.blueprint.json',
            { eager: true, import: 'default' }
        );
        for (const json of Object.values(modules)) {
            WorldStampRegistry.ParseTemplate(json, horizontal, vertical);
        }

        const allPaths = await window.api.userdata.list().catch(() => [] as string[]);
        for (const path of allPaths.filter(p => p.endsWith('.blueprint.json'))) {
            const raw = await window.api.userdata.read(path).catch(() => null);
            if (!raw) { continue; }
            try {
                WorldStampRegistry.ParseTemplate(JSON.parse(raw) as TemplateJson, horizontal, vertical);
            } catch { continue; }
        }

        WorldStampRegistry.horizontalTemplates = horizontal;
        WorldStampRegistry.verticalTemplates = vertical;
        LogManager.Instance?.Log({
            text: `Blueprint templates loaded — H: ${horizontal.length}, V: ${vertical.length}.`,
            options: { tags: ['World'] }
        });
    }

    private static ParseTemplate(json: TemplateJson, horizontal: Blueprint[], vertical: Blueprint[]): void {
        const component = json.components.find(c => c.type === 'Blueprint');
        if (!component) { return; }
        const bp = component as unknown as Blueprint;
        bp.name = json.name;
        (bp.size.width >= bp.size.height ? horizontal : vertical).push(bp);
    }

    /** Returns all loaded horizontal (landscape) blueprint templates. @internal */
    public static GetHorizontalTemplates(): Blueprint[] { return WorldStampRegistry.horizontalTemplates ?? []; }

    /** Returns all loaded vertical (portrait) blueprint templates. @internal */
    public static GetVerticalTemplates(): Blueprint[] { return WorldStampRegistry.verticalTemplates ?? []; }

    /**
     * Returns true if the blueprint can be placed at the given chunk position.
     * All touching edges with existing placements must have matching colors.
     * Always returns true if no existing placements are adjacent.
     * @internal
     */
    public CanPlace(blueprint: Blueprint, chunkX: number, chunkY: number): boolean {
        for (const record of this.records) {
            if (!BlueprintQuery.CanPlace({ candidate: blueprint, candidateChunkAddress: { cx: chunkX, cy: chunkY }, existing: record.blueprint, existingChunkAddress: { cx: record.chunkX, cy: record.chunkY } })) {
                LogManager.Instance?.Log({
                    text: `CanPlace FAIL at (${chunkX},${chunkY}) vs (${record.chunkX},${record.chunkY})`,
                    options: { tags: ['World'] }
                });
                return false;
            }
        }
        return true;
    }

    /** Builds a WorldStamp from the blueprint and stores the placement record. @internal */
    public Place(blueprint: Blueprint, chunkX: number, chunkY: number, materials: BiomeStampMaterialMap, seed: number): void {
        const chunkSize = ChunkData.GetChunkSize();
        const border = WorldStampRegistry.blueprintBorder;
        const worldPos = { x: chunkX * chunkSize, y: chunkY * chunkSize };
        const contentSize = {
            width: blueprint.size.width - 2 * border,
            height: blueprint.size.height - 2 * border,
        };
        const stamp = new WorldStamp({ worldPos, contentSize, border, cells: blueprint.cells, materials, seed });
        this.records.push({ blueprint, stamp, chunkX, chunkY });
        LogManager.Instance?.Log({
            text: `Placed ${blueprint.name} at chunk (${chunkX},${chunkY}) — worldPos (${worldPos.x},${worldPos.y}), content ${contentSize.width}×${contentSize.height}`,
            options: { tags: ['World'] }
        });
    }

    /** Returns all stamps for passing to WorldGen.SetStamps(). @internal */
    public GetStamps(): WorldStamp[] { return this.records.map(record => record.stamp); }

    /** Fills all biome stamp regions with diagonal herringbone blueprint tiles. @internal */
    public Fill(seed: number): void {
        const hTemplates = WorldStampRegistry.horizontalTemplates ?? [];
        const vTemplates = WorldStampRegistry.verticalTemplates ?? [];
        if (hTemplates.length === 0) { return; }

        for (const chunk of WorldMap.GetMap()) {
            if (!chunk.stampRegion) { continue; }
            const biome = BiomeRegistry.Biomes[chunk.biome];
            if (!biome.stamps) { continue; }
            const filteredH = hTemplates.filter(bp => bp.biomes.length === 0 || bp.biomes.includes(chunk.biome));
            const filteredV = vTemplates.filter(bp => bp.biomes.length === 0 || bp.biomes.includes(chunk.biome));
            this.FillRegion(filteredH, filteredV, biome.stamps, chunk.stampRegion, seed);
        }
    }

    /** 
     * Fills the given stamp region with diagonal herringbone blueprint tiles.
     * Respects edge seam constraints and anti-repeat windowing.
     * @internal
     */
    private FillRegion(
        hTemplates: Blueprint[],
        vTemplates: Blueprint[],
        materials: BiomeStampMaterialMap,
        region: { from: ChunkAddress; to: ChunkAddress },
        seed: number
    ): void {
        // Diagonal herringbone: units staircase at (+1,+1) per step.
        // Phase = (rx - ry + phaseOffset) mod 4, rx/ry region-relative.
        // phase 0 → V (1×2), phase 1 → H (2×1), else empty.
        // V and H in a unit share one seed (from V's position).
        // Two seam constraints enforced via placed H lookup:
        //   V.S   = H_at(cx, cy-1).N_L      (H whose top-left meets V's bottom)
        //   H.S_L = H_at(cx-1, cy-1).N_R    (H whose top-right meets this H's bottom-left)
        const antiRepeatWindow = 3;
        const phaseOffset = (seed >>> 0) % 4;
        const placedH = new Map<string, Blueprint>();
        const placedV = new Map<string, Blueprint>();

        for (let cy = region.from.cy; cy < region.to.cy; cy++) {
            const recentHNames: string[] = [];
            const recentVNames: string[] = [];

            for (let cx = region.from.cx; cx < region.to.cx; cx++) {
                const rx = cx - region.from.cx;
                const ry = cy - region.from.cy;
                const phase = ((rx - ry + phaseOffset) % 4 + 4) % 4;

                if (phase === 0 && cy + 2 <= region.to.cy) {
                    const unitSeed = WorldStampRegistry.CellSeed(seed, cx, cy);
                    const hBelow = placedH.get(`${cx},${cy - 1}`) ?? null;
                    const validV = hBelow !== null
                        ? BlueprintQuery.FilterVByHBelow(vTemplates, hBelow)
                        : vTemplates;
                    if (validV.length === 0) { continue; }
                    const diagV = placedV.get(`${cx - 1},${cy - 1}`) ?? null;
                    const excludeV = diagV !== null && !recentVNames.includes(diagV.name)
                        ? [...recentVNames, diagV.name]
                        : recentVNames;
                    const poolV: Blueprint[] = excludeV.length > 0 && validV.some(v => !excludeV.includes(v.name))
                        ? validV.filter(v => !excludeV.includes(v.name))
                        : validV;
                    const pickedV = WorldStampRegistry.Pick(poolV, unitSeed);
                    recentVNames.push(pickedV.name);
                    if (recentVNames.length > antiRepeatWindow) { recentVNames.shift(); }
                    placedV.set(`${cx},${cy}`, pickedV);
                    this.Place(pickedV, cx, cy, materials, unitSeed);

                } else if (phase === 1 && cx + 2 <= region.to.cx) {
                    const unitSeed = WorldStampRegistry.CellSeed(seed, cx - 1, cy);
                    const hBelowLeft = placedH.get(`${cx - 1},${cy - 1}`) ?? null;
                    const validH = hBelowLeft !== null
                        ? BlueprintQuery.FilterHByHBelowLeft(hTemplates, hBelowLeft)
                        : hTemplates;
                    if (validH.length === 0) { continue; }
                    const poolH: Blueprint[] = recentHNames.length > 0 && validH.some(h => !recentHNames.includes(h.name))
                        ? validH.filter(h => !recentHNames.includes(h.name))
                        : validH;
                    const placed = WorldStampRegistry.Pick(poolH, unitSeed);
                    recentHNames.push(placed.name);
                    if (recentHNames.length > antiRepeatWindow) { recentHNames.shift(); }
                    placedH.set(`${cx},${cy}`, placed);
                    this.Place(placed, cx, cy, materials, unitSeed);
                }
            }
        }
    }

    private static Pick<T>(arr: T[], seed: number): T {
        let h = seed >>> 0;
        h = (Math.imul(h ^ (h >>> 16), 0x85ebca6b)) >>> 0;
        h = (Math.imul(h ^ (h >>> 13), 0xc2b2ae35)) >>> 0;
        h = (h ^ (h >>> 16)) >>> 0;
        return arr[h % arr.length];
    }

    private static CellSeed(seed: number, cx: number, cy: number): number {
        return ((seed ^ (cx * 1664525 + 1013904223) ^ (cy * 2654435761)) >>> 0);
    }
}
