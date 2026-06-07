import type { Blueprint } from './definitions/blueprint/Blueprint';
import type { BoxCollider } from './definitions/collider/boxcollider/BoxCollider';
import type { CircleCollider } from './definitions/collider/circlecollider/CircleCollider';
import type { ParticleSystem } from './definitions/particlesystem/ParticleSystem';
import type { PixelData } from './definitions/pixeldata/PixelData';
import type { PixelBodyCollider } from './definitions/collider/pixelbodycollider/PixelBodyCollider';
import type { Rigidbody } from './definitions/rigidbody/Rigidbody';
import type { Transform } from './definitions/transform/Transform';

export type ComponentType =
    | 'Blueprint'
    | 'BoxCollider'
    | 'CircleCollider'
    | 'ParticleSystem'
    | 'PixelData'
    | 'PixelBodyCollider'
    | 'Rigidbody'
    | 'Transform'


// @omitfromdocs
export type AnyComponent =
    | Blueprint
    | BoxCollider
    | CircleCollider
    | ParticleSystem
    | PixelData
    | PixelBodyCollider
    | Rigidbody
    | Transform

/** Shared base for all component types. */
export abstract class Component {
    abstract readonly type: ComponentType;
    enabled: boolean = true;
}
