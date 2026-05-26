import { Nitrate } from '@Nitrate';

import type { SelectSetting } from '../UserInterfaceTypes';
import type { ControlHandler } from '../UserInterfaceRegistry';
import { UserInterfaceRegistry } from '../UserInterfaceRegistry';

/** Control handler for `SelectSetting`. Renders a labeled dropdown. */
export class SelectControl implements ControlHandler<SelectSetting> {
    public static readonly Instance = new SelectControl();
    private constructor() { UserInterfaceRegistry.Register('select', this); }

    // @omitfromdocs
    public Build(_key: string, setting: SelectSetting) {
        const wrapper = document.createElement('div');
        wrapper.className = 'control-item';

        if (setting.label) {
            const label = document.createElement('label');
            label.htmlFor = setting.id;
            label.textContent = setting.label;
            wrapper.appendChild(label);
        }

        const select = document.createElement('select');
        select.id = setting.id;
        for (const opt of setting.options) {
            const el = document.createElement('option');
            el.value = String(opt.value);
            el.textContent = opt.label;
            select.appendChild(el);
        }
        select.value = String(setting.default);
        wrapper.appendChild(select);

        return { wrapper, element: select, isValue: true };
    }

    // @omitfromdocs
    public Bind(_key: string, element: HTMLSelectElement, _entry: unknown, fireChange: () => void, _onAction: unknown) {
        element.addEventListener('change', fireChange);
    }

    // @omitfromdocs
    public GetRawValue(element: HTMLSelectElement, setting: SelectSetting): number {
        const fallback = Nitrate.Utils.FiniteNumber(setting.default, 0);
        const allowed = setting.options.map(o => Nitrate.Utils.FiniteNumber(o.value, fallback));
        const raw = Nitrate.Utils.FiniteNumber(element.value, fallback);
        if (allowed.includes(raw)) { return raw; }
        if (allowed.includes(fallback)) { return fallback; }
        return allowed[0] ?? fallback;
    }
}
