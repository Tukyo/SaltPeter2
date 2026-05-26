import type { Size2D, Vec2 } from '../../../definitions/Primitives';

import { Component } from '../../Component';

import iconUrl from './icon.png';

export interface BlueprintCell {
    pos: Vec2;
    colorVariant: number;
}

export class Blueprint extends Component {
    static readonly label = 'Blueprint';
    static readonly icon = iconUrl;
    readonly type = 'Blueprint' as const;
    size: Size2D = { width: 0, height: 0 };
    cells: BlueprintCell[] = [];
}
