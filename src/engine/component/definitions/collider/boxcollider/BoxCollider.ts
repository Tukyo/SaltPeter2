import type { Size2D } from "../../../../definitions/Primitives";

import { Collider } from "../Collider";

import iconUrl from './icon.png';

export class BoxCollider extends Collider {
    static readonly label = 'Box Collider';
    static readonly icon = iconUrl;
    readonly type = 'BoxCollider' as const;
    size: Size2D = { width: 1, height: 1 };
}
