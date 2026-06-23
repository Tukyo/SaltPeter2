import type { CircleCollider } from '../../../component/definitions/collider/circlecollider/CircleCollider';

import { ComponentField } from '../ComponentField';

export class CircleColliderField extends ComponentField<CircleCollider> {
    public static readonly forType = 'CircleCollider';
    public static readonly menu = 'Physics/'

    protected BuildFields(container: HTMLElement): void {
        container.appendChild(this.Vec2Field(
            'Offset',
            this.component.offset, v => { this.component.offset = v; },
            ['X', 'Y'], 'Offset of the collider from the GameObject origin.'
        ));
        container.appendChild(this.NumberField(
            'Radius',
            this.component.radius, v => { this.component.radius = v; },
            'Radius of the circle collider in cells.'
        ));
        container.appendChild(this.BoolField(
            'Is Trigger',
            this.component.isTrigger, v => { this.component.isTrigger = v; },
            'When enabled, detects overlaps but does not resolve physics collisions.'
        ));
    }
}
