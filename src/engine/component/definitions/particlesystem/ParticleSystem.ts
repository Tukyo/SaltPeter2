import type { ParticleDefinition } from '../../../particle/ParticleModel';
import { Component } from '../../Component';

import iconUrl from './icon.png';

export class ParticleSystem extends Component {
    static readonly label = 'ParticleSystem';
    static readonly icon = iconUrl;
    readonly type = 'ParticleSystem' as const;
    runtimeSlot: number = -1;
    particle: ParticleDefinition['modules'] = {
        main: {
            duration: 1,
            gravityMultiplier: 1,
            loop: true,
            start: {
                delay: 0,
                lifetime: 1,
                speed: 1
            }
        },
    };
}
