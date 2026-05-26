import type { MaterialName } from './MaterialIdentity';

export interface MaterialTransition {
    to: MaterialName;
    condition: MaterialTransitionCondition;
}

export interface MaterialTransitionCondition {
    temperature?: number;
    pressure?: number;
    durability?: number;
}

export interface MaterialTransitions {
    melts?: MaterialTransition
    freezes?: MaterialTransition;
    boils?: MaterialTransition;
    condenses?: MaterialTransition;
    breaks?: MaterialTransition;
}