import type { SelectSetting } from '../UserInterfaceTypes';
import type { ControlHandler } from '../UserInterfaceRegistry';

import { TooltipManager } from '../TooltipManager';
import { UserInterfaceRegistry } from '../UserInterfaceRegistry';
import { Utils } from '../../utility/Utils';

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

        if (setting.tooltip) {
            const tooltip = setting.tooltip;
            wrapper.addEventListener('mouseenter', () => TooltipManager.Instance?.Show(tooltip));
            wrapper.addEventListener('mouseleave', () => TooltipManager.Instance?.Hide());
        }

        return { wrapper, element: select, isValue: true };
    }

    // @omitfromdocs
    public Bind(_key: string, element: HTMLSelectElement, _entry: unknown, fireChange: () => void, _onAction: unknown) {
        element.addEventListener('change', fireChange);
    }

    // @omitfromdocs
    public GetRawValue(element: HTMLSelectElement, setting: SelectSetting): number {
        const fallback = Utils.FiniteNumber(setting.default, 0);
        const allowed = setting.options.map(o => Utils.FiniteNumber(o.value, fallback));
        const raw = Utils.FiniteNumber(element.value, fallback);
        if (allowed.includes(raw)) { return raw; }
        if (allowed.includes(fallback)) { return fallback; }
        return allowed[0] ?? fallback;
    }
}
