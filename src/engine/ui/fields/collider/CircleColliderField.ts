import type { CircleCollider } from '../../../component/definitions/collider/circlecollider/CircleCollider';

import { ComponentField } from '../ComponentField';

export class CircleColliderField extends ComponentField<CircleCollider> {
    public static readonly forType = 'CircleCollider';

    protected BuildFields(container: HTMLElement): void {
        container.appendChild(this.Vec2Field('Offset', this.component.offset, v => { this.component.offset = v; }));
        container.appendChild(this.NumberField('Radius', this.component.radius, v => { this.component.radius = v; }));
        container.appendChild(this.BoolField('Is Trigger', this.component.isTrigger, v => { this.component.isTrigger = v; }));
    }
}
