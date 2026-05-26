import type { GameObjectId } from '../../../game_object/GameObject';
import type { Vec2 } from '../../../definitions/Primitives';

import { Component } from '../../Component';

import iconUrl from './icon.png';

export class Transform extends Component {
    static readonly label = 'Transform';
    static readonly icon = iconUrl;
    readonly type = 'Transform' as const;
    position: Vec2 = { x: 0, y: 0 };
    rotation: number = 0;
    scale: Vec2 = { x: 1, y: 1 };
    parentId: GameObjectId | null = null;
}
