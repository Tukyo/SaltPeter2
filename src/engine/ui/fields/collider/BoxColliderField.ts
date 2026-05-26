import type { BoxCollider } from '../../../component/definitions/collider/boxcollider/BoxCollider';

import { ComponentField } from '../ComponentField';

export class BoxColliderField extends ComponentField<BoxCollider> {
    public static readonly forType = 'BoxCollider';

    protected BuildFields(container: HTMLElement): void {
        container.appendChild(this.Vec2Field('Offset', this.component.offset, v => { this.component.offset = v; }));
        container.appendChild(this.Vec2Field('Size', this.component.size, v => { this.component.size = v; }));
        container.appendChild(this.BoolField('Is Trigger', this.component.isTrigger, v => { this.component.isTrigger = v; }));
    }
}
