import type { ChoiceSetting } from '../UserInterfaceTypes';
import type { ControlHandler } from '../UserInterfaceRegistry';

import { TooltipManager } from '../TooltipManager';
import { UserInterfaceRegistry } from '../UserInterfaceRegistry';

/** Control handler for `ChoiceSetting`. Renders a segmented button group with single selection. */
export class ChoiceControl implements ControlHandler<ChoiceSetting> {
    public static readonly Instance = new ChoiceControl();
    private constructor() { UserInterfaceRegistry.Register('choice', this); }

    private Sync(group: HTMLDivElement, setting: ChoiceSetting): void {
        const allowed = setting.options.map(o => o.value);
        const current = group.dataset.value ?? '';
        const value = allowed.includes(current) ? current : (setting.default ?? allowed[0] ?? '');
        group.dataset.value = value;
        group.querySelectorAll('button').forEach(btn => {
            const selected = btn.dataset.value === value;
            btn.classList.toggle('is-selected', selected);
            btn.setAttribute('aria-checked', String(selected));
        });
    }

    // @omitfromdocs
    public Build(_key: string, setting: ChoiceSetting) {
        const wrapper = document.createElement('div');
        wrapper.className = 'control-item';

        const group = document.createElement('div');
        group.id = setting.id;
        group.className = 'choice-group bubble-choice-group';
        group.setAttribute('role', 'radiogroup');
        group.dataset.value = setting.default;

        for (const opt of setting.options) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'bubble-choice';
            btn.dataset.value = opt.value;
            btn.setAttribute('role', 'radio');
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
                element.dataset.value = btn.dataset.value;
                element.querySelectorAll<HTMLElement>('button').forEach(b => {
                    const selected = b.dataset.value === element.dataset.value;
                    b.classList.toggle('is-selected', selected);
                    b.setAttribute('aria-checked', String(selected));
                });
                fireChange();
            });
        });
    }

    // @omitfromdocs
    public GetRawValue(element: HTMLDivElement, setting: ChoiceSetting): string {
        const raw = element.dataset.value ?? setting.default;
        const allowed = setting.options.map(o => o.value);
        return allowed.includes(raw) ? raw : (setting.default ?? allowed[0] ?? '');
    }
}
