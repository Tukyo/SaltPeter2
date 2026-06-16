import type { ButtonSetting } from '../UserInterfaceTypes';
import type { ControlHandler } from '../UserInterfaceRegistry';

import { TooltipManager } from '../TooltipManager';
import { UserInterfaceRegistry } from '../UserInterfaceRegistry';

/** Control handler for `ButtonSetting`. Renders a single labeled action button. */
export class ButtonControl implements ControlHandler<ButtonSetting> {
    public static readonly Instance = new ButtonControl();
    private constructor() { UserInterfaceRegistry.Register('button', this); }

    // @omitfromdocs
    public Build(_key: string, setting: ButtonSetting) {
        const wrapper = document.createElement('div');
        wrapper.className = 'control-item';

        const btn = document.createElement('button');
        btn.id = setting.id;
        btn.type = 'button';
        const variantClass = setting.variant === 'danger' ? ' action-button--danger'
            : setting.variant === 'warn' ? ' action-button--warn'
                : '';
        btn.className = 'action-button' + variantClass;
        btn.textContent = setting.label;
        btn.dataset.action = setting.action;
        wrapper.appendChild(btn);

        if (setting.tooltip) {
            const tooltip = setting.tooltip;

            wrapper.addEventListener('mouseenter', () => TooltipManager.Instance?.Show(tooltip));
            wrapper.addEventListener('mouseleave', () => TooltipManager.Instance?.Hide());
        }

        return { wrapper, element: btn, isValue: false };
    }

    // @omitfromdocs
    public Bind(key: string, element: HTMLButtonElement, _entry: unknown, _fireChange: () => void, onAction: ((key: string, action: string) => void) | null) {
        element.addEventListener('click', () => { onAction?.(key, element.dataset.action ?? ''); });
    }

    // @omitfromdocs
    public GetRawValue(_element: HTMLButtonElement, _setting: ButtonSetting): string { return ''; }
}
