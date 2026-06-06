import type { Color } from '../../definitions/Primitives';
import type { MaterialId, MaterialName } from './MaterialIdentity'
import type { MaterialPhase, MaterialPhaseBehavior } from './MaterialPhases'
import type { MaterialPhysics } from './MaterialPhysics'
import type { MaterialState } from './MaterialState'
import type { MaterialTransitions } from './MaterialTransitions'
import type { MaterialTag } from './MaterialTags'
import type { MaterialVariant } from './MaterialVariants'

export interface MaterialDefinition {
    id: MaterialId;
    name: MaterialName;
    colors: readonly [Color, Color, Color, Color];
    variants?: readonly MaterialVariant[];

    state: MaterialState;

    phase: MaterialPhase;
    phaseBehavior: MaterialPhaseBehavior;

    physics: MaterialPhysics;
    transitions?: MaterialTransitions;
    tags?: readonly MaterialTag[];
}
