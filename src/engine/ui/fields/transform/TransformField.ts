import type { Transform } from '../../../component/definitions/transform/Transform';

import { ComponentField } from '../ComponentField';

export class TransformField extends ComponentField<Transform> {
    public static readonly forType = 'Transform';

    protected BuildFields(container: HTMLElement): void {
        container.appendChild(this.Vec2Field(
            'Position',
            this.component.position, v => { this.component.position = v; },
            ['X', 'Y'],
            'World position of the GameObject in simulation cells.'
        ));
        container.appendChild(this.NumberField(
            'Rotation',
            this.component.rotation, v => { this.component.rotation = v; },
            'Rotation of the GameObject in degrees.'
        ));
        container.appendChild(this.Vec2Field(
            'Scale',
            this.component.scale, v => { this.component.scale = v; },
            ['X', 'Y'],
            'Scale multiplier applied to the GameObject.'
        ));
    }
}
