import type { ActionGroupSetting } from '../UserInterfaceTypes';
import type { ControlHandler } from '../UserInterfaceRegistry';

import { TooltipManager } from '../TooltipManager';
import { UserInterfaceRegistry } from '../UserInterfaceRegistry';

/** Control handler for `ActionGroupSetting`. Renders a row of icon buttons that fire action callbacks. */
export class ActionGroupControl implements ControlHandler<ActionGroupSetting> {
    public static readonly Instance = new ActionGroupControl();
    private constructor() { UserInterfaceRegistry.Register('actionGroup', this); }

    // @omitfromdocs
    public Build(_key: string, setting: ActionGroupSetting) {
        const wrapper = document.createElement('div');
        wrapper.className = 'control-item control-action-group';

        const group = document.createElement('div');
        group.id = setting.id;
        group.className = 'icon-button-group';

        for (const opt of setting.options) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'icon-button icon-button-' + opt.icon;
            btn.dataset.action = opt.value;
            btn.setAttribute('aria-label', opt.label);

            if (opt.tooltip) {
                const tooltip = opt.tooltip;
                btn.addEventListener('mouseenter', () => TooltipManager.Instance?.Show(tooltip));
                btn.addEventListener('mouseleave', () => TooltipManager.Instance?.Hide());
            }

            group.appendChild(btn);
        }

        wrapper.appendChild(group);
        return { wrapper, element: group, isValue: false };
    }

    // @omitfromdocs
    public Bind(key: string, element: HTMLDivElement, _entry: unknown, _fireChange: () => void, onAction: ((key: string, action: string) => void) | null) {
        element.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => { onAction?.(key, (btn as HTMLElement).dataset.action ?? ''); });
        });
    }

    // @omitfromdocs
    public GetRawValue(_element: HTMLDivElement, _setting: ActionGroupSetting): string { return ''; }
}
