import type { Blueprint } from './definitions/blueprint/Blueprint';
import type { ChunkAddress } from '../world/chunk/ChunkData';
import type { EdgeKey } from './BlueprintLayout';

interface CanPlaceParams {
    candidate: Blueprint;
    candidateChunkAddress: ChunkAddress;
    existing: Blueprint;
    existingChunkAddress: ChunkAddress;
}

/** Helpers for reading and comparing blueprint edge seams. */
export class BlueprintQuery {
    /** Returns vertical tiles whose bottom connects to the top-left of the horizontal tile below. @internal */
    public static FilterVByHBelow(vTemplates: Blueprint[], hBelow: Blueprint): Blueprint[] {
        return vTemplates.filter(v => BlueprintQuery.GetEdgeMatch(v, 'S', hBelow, 'N_L'));
    }

    /** Returns horizontal tiles whose bottom-left connects to the top-right of the horizontal tile below-left. @internal */
    public static FilterHByHBelowLeft(hTemplates: Blueprint[], hBelowLeft: Blueprint): Blueprint[] {
        return hTemplates.filter(h => BlueprintQuery.GetEdgeMatch(h, 'S_L', hBelowLeft, 'N_R'));
    }

    /** Returns true if the blueprint can be placed adjacent to the existing blueprint at the given chunk positions. @internal */
    public static CanPlace(params: CanPlaceParams): boolean {
        const { candidate, candidateChunkAddress, existing, existingChunkAddress } = params;
        const pairs = BlueprintQuery.GetAdjacentEdgePairs(candidate, candidateChunkAddress, existing, existingChunkAddress);
        for (const [aKey, bKey] of pairs) {
            if (!BlueprintQuery.GetEdgeMatch(candidate, aKey, existing, bKey)) { return false; }
        }
        return true;
    }

    /** Returns an edge match for a blueprints edge keys. */
    private static GetEdgeMatch(a: Blueprint, aKey: EdgeKey, b: Blueprint, bKey: EdgeKey): boolean {
        const av = a.edges[aKey];
        const bv = b.edges[bKey];
        return av !== undefined && bv !== undefined && av === bv;
    }

    /**
     * Returns the pairs of edge keys that must match between two adjacent blueprints at the given chunk positions.
     * Returns an empty array if the blueprints are not adjacent or the adjacency is not handled.
     */
    private static GetAdjacentEdgePairs(
        a: Blueprint,
        aAddr: ChunkAddress,
        b: Blueprint,
        bAddr: ChunkAddress
    ): Array<readonly [EdgeKey, EdgeKey]> {
        const aH = a.size.width >= a.size.height;
        const bH = b.size.width >= b.size.height;
        const dx = bAddr.cx - aAddr.cx;
        const dy = bAddr.cy - aAddr.cy;

        if (aH && bH) {
            if (dx === 0 && dy === 1) { return [['N_L', 'S_L'], ['N_R', 'S_R']]; }
            if (dx === 0 && dy === -1) { return [['S_L', 'N_L'], ['S_R', 'N_R']]; }
        }

        if (aH && !bH) {
            if (dx === -1 && dy === 0) { return [['W', 'E_B']]; }
            if (dx === -1 && dy === -1) { return [['W', 'E_T']]; }
            if (dx === 2 && dy === 0) { return [['E', 'W_B']]; }
            if (dx === 2 && dy === -1) { return [['E', 'W_T']]; }
        }

        if (!aH && bH) {
            if (dx === 1 && dy === 0) { return [['E_B', 'W']]; }
            if (dx === 1 && dy === 1) { return [['E_T', 'W']]; }
            if (dx === -2 && dy === 0) { return [['W_B', 'E']]; }
            if (dx === -2 && dy === 1) { return [['W_T', 'E']]; }
        }

        if (!aH && !bH) {
            if (dx === 0 && dy === 2) { return [['N', 'S']]; }
            if (dx === 0 && dy === -2) { return [['S', 'N']]; }
        }

        return [];
    }
}
