import type { PixelData } from '../../../component/definitions/pixeldata/PixelData';

import { ComponentField } from '../ComponentField';

export class PixelDataField extends ComponentField<PixelData> {
    public static readonly forType = 'PixelData';

    protected BuildFields(container: HTMLElement): void {
        container.appendChild(this.ReadOnlyVec2Field(
            'Size', ['W', 'H'],
            String(this.component.size.width),
            String(this.component.size.height),
        ));
        container.appendChild(this.ReadOnlyVec2Field(
            'Pivot', ['X', 'Y'],
            String(this.component.pivot.x),
            String(this.component.pivot.y),
        ));
        container.appendChild(this.ReadOnlyField('Cells', String(this.component.cells.length)));
    }
}
