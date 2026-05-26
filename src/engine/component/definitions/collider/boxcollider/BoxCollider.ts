import type { Vec2 } from "../../../../definitions/Primitives";

import { Collider } from "../Collider";

import iconUrl from './icon.png';

export class BoxCollider extends Collider {
    static readonly label = 'Box Collider';
    static readonly icon = iconUrl;
    readonly type = 'BoxCollider' as const;
    size: Vec2 = { x: 1, y: 1 };
}
