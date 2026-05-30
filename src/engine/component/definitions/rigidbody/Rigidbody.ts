import type { Vec2 } from '../../../definitions/Primitives';

import { Component } from '../../Component';

import iconUrl from './icon.png';

export type RigidbodyType =
    | 'Static'
    | 'Kinematic'
    | 'Dynamic';

export class Rigidbody extends Component {
    static readonly label = 'Rigidbody';
    static readonly icon = iconUrl;
    readonly type = 'Rigidbody' as const;
    bodyType: RigidbodyType = 'Dynamic';
    static readonly BodyTypeValue: Record<RigidbodyType, number> = {
        Static: 0,
        Dynamic: 1,
        Kinematic: 2,
    };
    mass: number = 1;
    gravityScale: number = 1;
    drag: number = 0;
    angularDrag: number = 0;
    friction: number = 0.5;
    bounciness: number = 0.2;
    velocity: Vec2 = { x: 0, y: 0 };
    angularVelocity: number = 0;
    isSleeping: boolean = false;
}
