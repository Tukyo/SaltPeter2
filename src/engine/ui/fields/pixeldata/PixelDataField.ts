import type { PixelData } from '../../../component/definitions/pixeldata/PixelData';

import { ComponentField } from '../ComponentField';

export class PixelDataField extends ComponentField<PixelData> {
    public static readonly forType = 'PixelData';

    protected BuildFields(container: HTMLElement): void {
        container.appendChild(this.ReadOnlyVec2Field(
            'Size', ['W', 'H'],
            String(this.component.size.width),
            String(this.component.size.height),
            'Dimensions of the pixel data texture in cells.'
        ));
        container.appendChild(this.ReadOnlyVec2Field(
            'Pivot', ['X', 'Y'],
            String(this.component.pivot.x),
            String(this.component.pivot.y),
            'Pivot point within the texture, used as the origin for placement.'
        ));
        container.appendChild(this.ReadOnlyField(
            'Cells',
            String(this.component.cells.length),
            'Total number of non-empty cells in the pixel data.'
        ));
    }
}
