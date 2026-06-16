import type { Rigidbody, RigidbodyType } from '../../../component/definitions/rigidbody/Rigidbody';

import { ComponentField } from '../ComponentField';

export class RigidbodyField extends ComponentField<Rigidbody> {
    public static readonly forType = 'Rigidbody';

    protected BuildFields(container: HTMLElement): void {
        const types: RigidbodyType[] = ['Static', 'Kinematic', 'Dynamic'];
        container.appendChild(this.SelectField(
            'Body Type',
            this.component.bodyType, types, v => { this.component.bodyType = v as RigidbodyType; },
            'Physics simulation mode for this body.'
        ));
        container.appendChild(this.NumberField(
            'Mass',
            this.component.mass, v => { this.component.mass = v; },
            'Mass of the body used in force calculations.'
        ));
        container.appendChild(this.NumberField(
            'Gravity Scale',
            this.component.gravityScale, v => { this.component.gravityScale = v; },
            'Multiplier applied to gravity for this body.'
        ));
        container.appendChild(this.NumberField(
            'Drag',
            this.component.drag, v => { this.component.drag = v; },
            'Linear damping applied each frame to reduce velocity.'
        ));
        container.appendChild(this.NumberField(
            'Angular Drag',
            this.component.angularDrag, v => { this.component.angularDrag = v; },
            'Rotational damping applied each frame to reduce angular velocity.'
        ));
        container.appendChild(this.SliderField(
            'Friction',
            this.component.friction, 0, 1, 0.01, v => { this.component.friction = v; },
            'Surface friction applied for each contact.'
        ));
        container.appendChild(this.SliderField(
            'Bounciness',
            this.component.bounciness, 0, 1, 0.01, v => { this.component.bounciness = v; },
            'Elasticity of collisions. 0 is no bounce, 1 is full rebound.'
        ));
    }
}
