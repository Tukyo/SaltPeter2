import type { EdgeKey } from '../../BlueprintLayout';
import type { Size2D, Vec2 } from '../../../definitions/Primitives';
import type { BiomeName } from '../../../world/biome/definitions/BiomeIdentity';

import { Component } from '../../Component';

import iconUrl from './icon.png';

export type BlueprintEdges = Partial<Record<EdgeKey, string>>;

export interface BlueprintCell {
    pos: Vec2;
    type: string;
    colorIndex: number;
}

export class Blueprint extends Component {
    static readonly label = 'Blueprint';
    static readonly icon = iconUrl;
    readonly type = 'Blueprint' as const;
    name: string = '';
    size: Size2D = { width: 0, height: 0 };
    biomes: BiomeName[] = [];
    edges: BlueprintEdges = {};
    cells: BlueprintCell[] = [];
}
