import type { BoxCollider } from '../../../component/definitions/collider/boxcollider/BoxCollider';

import { ComponentField } from '../ComponentField';

export class BoxColliderField extends ComponentField<BoxCollider> {
    public static readonly forType = 'BoxCollider';
    public static readonly menu = 'Physics/'

    protected BuildFields(container: HTMLElement): void {
        container.appendChild(this.Vec2Field(
            'Offset',
            this.component.offset, v => { this.component.offset = v; },
            ['X', 'Y'], 'Offset of the collider from the GameObject origin.'
        ));
        container.appendChild(this.Size2DField(
            'Size',
            this.component.size, v => { this.component.size = v; },
            'Width and height of the box collider in cells.'
        ));
        container.appendChild(this.BoolField(
            'Is Trigger',
            this.component.isTrigger, v => { this.component.isTrigger = v; },
            'When enabled, detects overlaps but does not resolve physics collisions.'
        ));
    }
}
