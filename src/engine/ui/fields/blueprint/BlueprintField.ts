import type { Blueprint } from '../../../component/definitions/blueprint/Blueprint';

import { ComponentField } from '../ComponentField';

export class BlueprintField extends ComponentField<Blueprint> {
    public static readonly forType = 'Blueprint';

    protected BuildFields(container: HTMLElement): void {
        container.appendChild(this.ReadOnlyVec2Field(
            'Size', ['W', 'H'],
            String(this.component.size.width),
            String(this.component.size.height),
        ));
        container.appendChild(this.ReadOnlyField('Cells', String(this.component.cells.length)));
    }
}
