import type { RangeSetting } from '../UserInterfaceTypes';
import type { ControlHandler } from '../UserInterfaceRegistry';

import { TooltipManager } from '../TooltipManager';
import { UserInterfaceRegistry } from '../UserInterfaceRegistry';
import { Utils } from '../../utility/Utils';

/** Control handler for `RangeSetting`. Renders a labeled slider with optional readout. */
export class RangeControl implements ControlHandler<RangeSetting> {
    public static readonly Instance = new RangeControl();
    private constructor() { UserInterfaceRegistry.Register('range', this); }

    private FormatValue(value: number, setting: RangeSetting): string {
        return value.toFixed(setting.decimals ?? 0) + (setting.suffix ?? '');
    }

    private SyncSliderFill(input: HTMLInputElement, setting: RangeSetting, value: number): void {
        const min = Utils.FiniteNumber(setting.min, 0);
        const max = Utils.FiniteNumber(setting.max, 1);
        const range = max - min;
        const percent = range > 0 ? Utils.Clamp((value - min) / range, 0, 1) : 0;
        input.style.setProperty('--value', (percent * 100) + '%');
    }

    // @omitfromdocs
    public Build(_key: string, setting: RangeSetting) {
        const wrapper = document.createElement('div');
        let readout: HTMLSpanElement | undefined;

        if (setting.readout) {
            wrapper.className = 'control-group';
            const row = document.createElement('div');
            row.className = 'control-label-row';
            const label = document.createElement('label');
            label.htmlFor = setting.id;
            label.textContent = setting.label ?? '';
            readout = document.createElement('span');
            readout.className = 'control-value';
            readout.id = setting.id + '-value';
            row.appendChild(label);
            row.appendChild(readout);
            wrapper.appendChild(row);
        } else if (setting.label) {
            wrapper.className = 'control-item';
            const label = document.createElement('label');
            label.htmlFor = setting.id;
            label.textContent = setting.label;
            wrapper.appendChild(label);
        } else {
            wrapper.className = 'control-item';
        }

        const input = document.createElement('input');
        input.type = 'range';
        input.id = setting.id;
        input.min = String(setting.min);
        input.max = String(setting.max);
        input.step = String(setting.step);
        input.value = String(setting.default);
        wrapper.appendChild(input);

        if (setting.tooltip) {
            const tooltip = setting.tooltip;
            wrapper.addEventListener('mouseenter', () => TooltipManager.Instance?.Show(tooltip));
            wrapper.addEventListener('mouseleave', () => TooltipManager.Instance?.Hide());
        }

        const sync = readout ? () => {
            const value = this.GetRawValue(input, setting) as number;
            input.value = String(value);
            readout!.textContent = this.FormatValue(value, setting);
            this.SyncSliderFill(input, setting, value);
        } : undefined;

        return { wrapper, element: input, readout, sync, isValue: true };
    }

    // @omitfromdocs
    public Bind(_key: string, element: HTMLInputElement, entry: { sync?: () => void }, fireChange: () => void, _onAction: unknown) {
        entry.sync?.();
        element.addEventListener('input', fireChange);
    }

    // @omitfromdocs
    public GetRawValue(element: HTMLInputElement, setting: RangeSetting): number {
        const fallback = Utils.FiniteNumber(setting.default, 0);
        const raw = Utils.FiniteNumber(element.value, fallback);
        let value = Utils.Clamp(raw, setting.min, setting.max);
        if (setting.integer) { value = Math.round(value); }
        return value;
    }

    // @omitfromdocs
    public GetModelValue(raw: number, setting: RangeSetting): number {
        if (setting.normalize === 'percent') { return raw / 100.0; }
        return raw;
    }
}
