import { Collider } from "../Collider";

import iconUrl from './icon.png';

export class CircleCollider extends Collider {
    static readonly label = 'Circle Collider';
    static readonly icon = iconUrl;
    readonly type = 'CircleCollider' as const;
    radius: number = 1;
}
