import type { ToggleListSetting } from '../UserInterfaceTypes';
import type { ControlHandler } from '../UserInterfaceRegistry';

import { TooltipManager } from '../TooltipManager';
import { UserInterfaceRegistry } from '../UserInterfaceRegistry';

/** Control handler for `ToggleListSetting`. Renders a scrollable vertical list of toggle rows with multi-selection. */
export class ToggleListControl implements ControlHandler<ToggleListSetting> {
    public static readonly Instance = new ToggleListControl();
    private constructor() { UserInterfaceRegistry.Register('toggleList', this); }

    private Sync(list: HTMLDivElement, setting: ToggleListSetting): void {
        const active = new Set((list.dataset.value ?? setting.default.join(',')).split(',').filter(Boolean));
        list.querySelectorAll('button').forEach(btn => {
            const on = active.has((btn as HTMLElement).dataset.value ?? '');
            btn.classList.toggle('is-selected', on);
            btn.setAttribute('aria-checked', String(on));
        });
    }

    // @omitfromdocs
    public Build(_key: string, setting: ToggleListSetting) {
        const wrapper = document.createElement('div');
        wrapper.className = 'control-item control-action-group';

        if (setting.label) {
            const label = document.createElement('label');
            label.textContent = setting.label;
            wrapper.appendChild(label);
        }

        const list = document.createElement('div');
        list.id = setting.id;
        list.className = 'toggle-list';
        list.dataset.value = setting.default.join(',');

        for (const opt of setting.options) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'toggle-list-row';
            btn.dataset.value = opt.value;
            btn.setAttribute('role', 'checkbox');
            btn.setAttribute('aria-label', opt.label);
            const dot = document.createElement('span');
            dot.className = 'bubble-choice-dot';
            const lbl = document.createElement('span');
            lbl.className = 'bubble-choice-label';
            lbl.textContent = opt.label;
            btn.appendChild(dot);
            btn.appendChild(lbl);

            if (opt.tooltip) {
                const tooltip = opt.tooltip;
                btn.addEventListener('mouseenter', () => TooltipManager.Instance?.Show(tooltip));
                btn.addEventListener('mouseleave', () => TooltipManager.Instance?.Hide());
            }

            list.appendChild(btn);
        }

        this.Sync(list, setting);
        wrapper.appendChild(list);

        if (setting.tooltip) {
            const tooltip = setting.tooltip;
            wrapper.addEventListener('mouseenter', () => TooltipManager.Instance?.Show(tooltip));
            wrapper.addEventListener('mouseleave', () => TooltipManager.Instance?.Hide());
        }

        return { wrapper, element: list, sync: () => { this.Sync(list, setting); }, isValue: true };
    }

    // @omitfromdocs
    public Bind(_key: string, element: HTMLDivElement, _entry: unknown, fireChange: () => void, _onAction: unknown) {
        element.querySelectorAll<HTMLElement>('button').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = btn.dataset.value ?? '';
                const active = new Set((element.dataset.value ?? '').split(',').filter(Boolean));
                if (active.has(val)) { active.delete(val); } else { active.add(val); }
                element.dataset.value = [...active].join(',');
                element.querySelectorAll<HTMLElement>('button').forEach(b => {
                    const on = active.has(b.dataset.value ?? '');
                    b.classList.toggle('is-selected', on);
                    b.setAttribute('aria-checked', String(on));
                });
                fireChange();
            });
        });
    }

    // @omitfromdocs
    public GetRawValue(element: HTMLDivElement, setting: ToggleListSetting): string {
        return element.dataset.value ?? setting.default.join(',');
    }
}
