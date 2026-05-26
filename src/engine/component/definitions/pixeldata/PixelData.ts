import type { MaterialId } from '../../../materials/definitions/MaterialIdentity';
import type { Size2D, Vec2 } from '../../../definitions/Primitives';

import { Component } from '../../Component';

import iconUrl from './icon.png';

export interface PixelCell {
    pos: Vec2;
    materialId: MaterialId;
    colorVariant: number;
}

export class PixelData extends Component {
    static readonly label = 'Pixeldata';
    static readonly icon = iconUrl;
    readonly type = 'PixelData' as const;
    size: Size2D = { width: 0, height: 0 };
    pivot: Vec2 = { x: 0, y: 0 };
    cells: PixelCell[] = [];
}
