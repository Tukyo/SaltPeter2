import type { Rigidbody, RigidbodyType } from '../../../component/definitions/rigidbody/Rigidbody';

import { ComponentField } from '../ComponentField';

export class RigidbodyField extends ComponentField<Rigidbody> {
    public static readonly forType = 'Rigidbody';

    protected BuildFields(container: HTMLElement): void {
        const types: RigidbodyType[] = ['Static', 'Kinematic', 'Dynamic'];
        container.appendChild(this.SelectField('Body Type', this.component.bodyType, types, v => {
            this.component.bodyType = v as RigidbodyType;
        }));
        container.appendChild(this.NumberField('Mass', this.component.mass, v => { this.component.mass = v; }));
        container.appendChild(this.NumberField('Gravity Scale', this.component.gravityScale, v => { this.component.gravityScale = v; }));
        container.appendChild(this.NumberField('Drag', this.component.drag, v => { this.component.drag = v; }));
        container.appendChild(this.NumberField('Angular Drag', this.component.angularDrag, v => { this.component.angularDrag = v; }));
        container.appendChild(this.SliderField('Friction',   this.component.friction,   0, 1, 0.01, v => { this.component.friction   = v; }));
        container.appendChild(this.SliderField('Bounciness', this.component.bounciness, 0, 1, 0.01, v => { this.component.bounciness = v; }));
    }
}
