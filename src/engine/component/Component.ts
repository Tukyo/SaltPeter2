import type { Blueprint } from './definitions/blueprint/Blueprint';
import type { BoxCollider } from './definitions/collider/boxcollider/BoxCollider';
import type { CircleCollider } from './definitions/collider/circlecollider/CircleCollider';
import type { PixelData } from './definitions/pixeldata/PixelData';
import type { Rigidbody } from './definitions/rigidbody/Rigidbody';
import type { Transform } from './definitions/transform/Transform';

export type ComponentType =
    | 'Transform'
    | 'Rigidbody'
    | 'BoxCollider'
    | 'CircleCollider'
    | 'PixelData'
    | 'Blueprint';

// @omitfromdocs
export type AnyComponent =
    | Transform
    | Rigidbody
    | BoxCollider
    | CircleCollider
    | PixelData
    | Blueprint;

/** Shared base for all component types. */
export abstract class Component {
    abstract readonly type: ComponentType;
    enabled: boolean = true;
}
