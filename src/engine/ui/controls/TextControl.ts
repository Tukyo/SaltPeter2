import type { TextSetting } from '../UserInterfaceTypes';
import type { ControlHandler } from '../UserInterfaceRegistry';

import { TooltipManager } from '../TooltipManager';
import { UserInterfaceRegistry } from '../UserInterfaceRegistry';

/** Control handler for `TextSetting`. Renders a labeled text input. */
export class TextControl implements ControlHandler<TextSetting> {
    public static readonly Instance = new TextControl();
    private constructor() { UserInterfaceRegistry.Register('text', this); }

    // @omitfromdocs
    public Build(_key: string, setting: TextSetting) {
        const wrapper = document.createElement('div');
        wrapper.className = 'control-item';

        if (setting.label) {
            const label = document.createElement('label');
            label.htmlFor = setting.id;
            label.textContent = setting.label;
            wrapper.appendChild(label);
        }

        const input = document.createElement('input');
        input.type = 'text';
        input.id = setting.id;
        input.placeholder = setting.placeholder ?? '';
        input.value = setting.default;
        wrapper.appendChild(input);

        if (setting.tooltip) {
            const tooltip = setting.tooltip;
            wrapper.addEventListener('mouseenter', () => TooltipManager.Instance?.Show(tooltip));
            wrapper.addEventListener('mouseleave', () => TooltipManager.Instance?.Hide());
        }

        return { wrapper, element: input, isValue: true };
    }

    // @omitfromdocs
    public Bind(_key: string, element: HTMLInputElement, _entry: unknown, fireChange: () => void, _onAction: unknown) {
        element.addEventListener('input', fireChange);
    }

    // @omitfromdocs
    public GetRawValue(element: HTMLInputElement, setting: TextSetting): string {
        return element.value ?? setting.default;
    }
}
