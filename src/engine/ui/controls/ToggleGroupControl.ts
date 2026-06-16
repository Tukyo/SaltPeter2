import type { ToggleGroupSetting } from '../UserInterfaceTypes';
import type { ControlHandler } from '../UserInterfaceRegistry';

import { TooltipManager } from '../TooltipManager';
import { UserInterfaceRegistry } from '../UserInterfaceRegistry';

/** Control handler for `ToggleGroupSetting`. Renders a segmented button group with multi-selection. */
export class ToggleGroupControl
 implements ControlHandler<ToggleGroupSetting> {
    public static readonly Instance = new ToggleGroupControl();
    private constructor() { UserInterfaceRegistry.Register('toggleGroup', this); }

    private Sync(group: HTMLDivElement, setting: ToggleGroupSetting): void {
        const active = new Set((group.dataset.value ?? setting.default.join(',')).split(',').filter(Boolean));
        group.querySelectorAll('button').forEach(btn => {
            const on = active.has((btn as HTMLElement).dataset.value ?? '');
            btn.classList.toggle('is-selected', on);
            btn.setAttribute('aria-checked', String(on));
        });
    }

    // @omitfromdocs
    public Build(_key: string, setting: ToggleGroupSetting) {
        const wrapper = document.createElement('div');
        wrapper.className = 'control-item control-action-group';

        if (setting.label) {
            const label = document.createElement('label');
            label.textContent = setting.label;
            wrapper.appendChild(label);
        }

        const group = document.createElement('div');
        group.id = setting.id;
        group.className = 'choice-group bubble-choice-group';
        group.dataset.value = setting.default.join(',');

        for (const opt of setting.options) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'bubble-choice';
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

            group.appendChild(btn);
        }

        this.Sync(group, setting);
        wrapper.appendChild(group);
        return { wrapper, element: group, sync: () => { this.Sync(group, setting); }, isValue: true };
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
    public GetRawValue(element: HTMLDivElement, setting: ToggleGroupSetting): string {
        return element.dataset.value ?? setting.default.join(',');
    }
}
