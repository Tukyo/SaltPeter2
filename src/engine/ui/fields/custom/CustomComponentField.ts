import type { CustomComponent } from '../../../component/definitions/custom/Custom';

import { ComponentField } from '../ComponentField';

const BASE_KEYS = new Set(['_enabled', 'gameObject', 'type']);

export class CustomComponentField extends ComponentField<CustomComponent> {
    public static readonly forType = 'CustomComponent';

    protected BuildFields(container: HTMLElement): void {
        const record = this.component as unknown as Record<string, unknown>;

        for (const key of Object.keys(this.component)) {
            if (BASE_KEYS.has(key)) { continue; }
            const value = record[key];

            const label = CustomComponentField.FormatFieldName(key);
            if (typeof value === 'number') {
                container.appendChild(this.NumberField(label, value, v => { record[key] = v; }));
            } else if (typeof value === 'boolean') {
                container.appendChild(this.InlineBoolField(label, value, v => { record[key] = v; }));
            } else if (typeof value === 'string') {
                container.appendChild(this.StringField(label, value, v => { record[key] = v; }));
            }
        }
    }

    private static FormatFieldName(key: string): string {
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
    }
}
