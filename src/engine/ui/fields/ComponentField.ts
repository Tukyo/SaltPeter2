import type { AnyComponent } from '../../component/Component';
import type { ComponentConstructor } from '../../component/ComponentRegistry';
import type { Color, NumberRange, RandomBetweenTwo, Size2D, Vec2 } from '../../definitions/Primitives';

import { ColorPickerControl } from '../controls/ColorPickerControl';
import { TooltipManager } from '../TooltipManager';
import { Utils } from '../../utility/Utils';

/**
 * Abstract base class for all component inspector fields.
 *
 * Builds the component section shell (header, icon, enable toggle, remove button) and exposes field builder helpers to subclasses.
 */
export abstract class ComponentField<T extends AnyComponent = AnyComponent> {
    public readonly element: HTMLElement;
    protected readonly component: T;

    constructor(component: T, onRemove: () => void) {
        this.component = component;

        const section = document.createElement('div');
        section.className = 'inspector-component';

        const header = document.createElement('div');
        header.className = 'inspector-component-header';
        header.addEventListener('click', () => {
            const fieldsEl = section.querySelector('.inspector-component-fields');
            if (!fieldsEl || fieldsEl.childElementCount === 0) { return; }
            section.classList.toggle('is-collapsed');
        });

        const icon = document.createElement('span');
        icon.className = 'inspector-component-icon';
        const iconUrl = (component.constructor as { icon?: string }).icon;
        if (iconUrl) { icon.style.backgroundImage = `url(${iconUrl})`; }
        header.appendChild(icon);

        if (component.type !== 'Transform') {
            const enabledCheck = document.createElement('input');
            enabledCheck.type = 'checkbox';
            enabledCheck.className = 'inspector-component-enabled';
            enabledCheck.checked = component.enabled;
            enabledCheck.addEventListener('click', (e) => { e.stopPropagation(); });
            enabledCheck.addEventListener('change', () => { component.enabled = enabledCheck.checked; });
            header.appendChild(enabledCheck);
        }

        const title = document.createElement('h3');
        title.textContent = (component.constructor as ComponentConstructor).label;
        header.appendChild(title);

        if (component.type !== 'Transform') {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'inspector-remove-btn';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                onRemove();
            });
            header.appendChild(removeBtn);
        }

        section.appendChild(header);

        const fields = document.createElement('div');
        fields.className = 'inspector-component-fields';
        this.BuildFields(fields);
        if (fields.childElementCount === 0) { section.classList.add('is-collapsed'); }
        section.appendChild(fields);

        this.element = section;
    }

    /** Implemented by subclasses to populate the fields container with input rows for the component's properties. */
    protected abstract BuildFields(container: HTMLElement): void;


    /** Builds a single labeled number input row. */
    protected NumberField(label: string, value: number, onChange: (v: number) => void, tooltip?: string): HTMLElement {
        const row = document.createElement('div');
        row.className = 'inspector-field';

        const lbl = document.createElement('label');
        lbl.textContent = label;

        const input = document.createElement('input');
        input.type = 'number';
        input.value = String(value);
        input.step = 'any';
        input.addEventListener('input', () => { onChange(parseFloat(input.value) || 0); });

        row.appendChild(lbl);
        row.appendChild(input);

        if (tooltip) {
            row.addEventListener('mouseenter', () => TooltipManager.Instance?.Show(tooltip));
            row.addEventListener('mouseleave', () => TooltipManager.Instance?.Hide());
        }

        return row;
    }

    /** Builds a labeled two-axis vector input row. */
    protected Vec2Field(
        label: string,
        value: Vec2,
        onChange: (v: Vec2) => void,
        axes: [string, string] = ['X', 'Y'],
        tooltip?: string
    ): HTMLElement {
        const row = document.createElement('div');
        row.className = 'inspector-field inspector-field-vec2';

        const lbl = document.createElement('label');
        lbl.textContent = label;

        const xl = document.createElement('span');
        xl.className = 'inspector-axis-label';
        xl.textContent = axes[0];

        const x = document.createElement('input');
        x.type = 'number'; x.value = String(value.x); x.step = 'any';

        const yl = document.createElement('span');
        yl.className = 'inspector-axis-label';
        yl.textContent = axes[1];

        const y = document.createElement('input');
        y.type = 'number'; y.value = String(value.y); y.step = 'any';
        const update = () => { onChange({ x: parseFloat(x.value) || 0, y: parseFloat(y.value) || 0 }); };
        x.addEventListener('input', update);
        y.addEventListener('input', update);

        row.appendChild(lbl);
        row.appendChild(xl);
        row.appendChild(x);
        row.appendChild(yl);
        row.appendChild(y);

        if (tooltip) {
            row.addEventListener('mouseenter', () => TooltipManager.Instance?.Show(tooltip));
            row.addEventListener('mouseleave', () => TooltipManager.Instance?.Hide());
        }

        return row;
    }

    /** Builds a labeled two-axis size input row (width / height). */
    protected Size2DField(
        label: string,
        value: Size2D,
        onChange: (v: Size2D) => void,
        tooltip?: string,
    ): HTMLElement {
        const row = document.createElement('div');
        row.className = 'inspector-field inspector-field-vec2';

        const lbl = document.createElement('label');
        lbl.textContent = label;

        const wl = document.createElement('span');
        wl.className = 'inspector-axis-label';
        wl.textContent = 'W';

        const w = document.createElement('input');
        w.type = 'number'; w.value = String(value.width); w.step = 'any';

        const hl = document.createElement('span');
        hl.className = 'inspector-axis-label';
        hl.textContent = 'H';

        const h = document.createElement('input');
        h.type = 'number'; h.value = String(value.height); h.step = 'any';

        const update = () => {
            onChange({ width: parseFloat(w.value) || 0, height: parseFloat(h.value) || 0 });
        };
        w.addEventListener('input', update);
        h.addEventListener('input', update);

        row.appendChild(lbl);
        row.appendChild(wl);
        row.appendChild(w);
        row.appendChild(hl);
        row.appendChild(h);

        if (tooltip) {
            row.addEventListener('mouseenter', () => TooltipManager.Instance?.Show(tooltip));
            row.addEventListener('mouseleave', () => TooltipManager.Instance?.Hide());
        }

        return row;
    }

    /** Builds a labeled dropdown select row. */
    protected SelectField(
        label: string,
        value: string,
        options: string[],
        onChange: (v: string) => void,
        tooltip?: string
    ): HTMLElement {
        const row = document.createElement('div');
        row.className = 'inspector-field';

        const lbl = document.createElement('label');
        lbl.textContent = label;

        const select = document.createElement('select');
        for (const opt of options) {
            const el = document.createElement('option');
            el.value = opt;
            el.textContent = opt;
            if (opt === value) { el.selected = true; }
            select.appendChild(el);
        }
        select.addEventListener('change', () => { onChange(select.value); });

        row.appendChild(lbl);
        row.appendChild(select);

        if (tooltip) {
            row.addEventListener('mouseenter', () => TooltipManager.Instance?.Show(tooltip));
            row.addEventListener('mouseleave', () => TooltipManager.Instance?.Hide());
        }

        return row;
    }

    /** Builds a labeled checkbox row. */
    protected BoolField(
        label: string,
        value: boolean,
        onChange: (v: boolean) => void,
        tooltip?: string
    ): HTMLElement {
        const row = document.createElement('div');
        row.className = 'inspector-field';

        const lbl = document.createElement('label');
        lbl.textContent = label;

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = value;
        input.addEventListener('change', () => { onChange(input.checked); });

        row.appendChild(lbl);
        row.appendChild(input);

        if (tooltip) {
            row.addEventListener('mouseenter', () => TooltipManager.Instance?.Show(tooltip));
            row.addEventListener('mouseleave', () => TooltipManager.Instance?.Hide());
        }

        return row;
    }

    /** Builds a labeled slider row clamped to [min, max] with a live value readout. */
    protected SliderField(
        label: string,
        value: number,
        min: number,
        max: number,
        step: number,
        onChange: (v: number) => void,
        tooltip?: string,
    ): HTMLElement {
        const row = document.createElement('div');
        row.className = 'inspector-field inspector-field-slider';

        const lbl = document.createElement('label');
        lbl.textContent = label;

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = String(min);
        slider.max = String(max);
        slider.step = String(step);
        slider.value = String(Math.min(max, Math.max(min, value)));

        const fillPercent = (v: number) => `${((v - min) / (max - min)) * 100}%`;
        slider.style.setProperty('--value', fillPercent(parseFloat(slider.value)));

        const readout = document.createElement('span');
        readout.className = 'inspector-slider-value';
        readout.textContent = parseFloat(slider.value).toFixed(2);

        slider.addEventListener('input', () => {
            const parsed = parseFloat(slider.value);
            slider.style.setProperty('--value', fillPercent(parsed));
            readout.textContent = parsed.toFixed(2);
            onChange(parsed);
        });

        row.appendChild(lbl);
        row.appendChild(slider);
        row.appendChild(readout);

        if (tooltip) {
            row.addEventListener('mouseenter', () => TooltipManager.Instance?.Show(tooltip));
            row.addEventListener('mouseleave', () => TooltipManager.Instance?.Hide());
        }

        return row;
    }

    /** Builds a read-only labeled text row. */
    protected ReadOnlyField(label: string, value: string, tooltip?: string): HTMLElement {
        const row = document.createElement('div');
        row.className = 'inspector-field inspector-field-readonly';

        const lbl = document.createElement('label');
        lbl.textContent = label;

        const span = document.createElement('span');
        span.textContent = value;

        row.appendChild(lbl);
        row.appendChild(span);

        if (tooltip) {
            row.addEventListener('mouseenter', () => TooltipManager.Instance?.Show(tooltip));
            row.addEventListener('mouseleave', () => TooltipManager.Instance?.Hide());
        }

        return row;
    }

    /** Builds a read-only labeled two-axis vector display row. */
    protected ReadOnlyVec2Field(
        label: string,
        axes: [string, string],
        v1: string,
        v2: string,
        tooltip?: string
    ): HTMLElement {
        const row = document.createElement('div');
        row.className = 'inspector-field inspector-field-vec2 inspector-field-readonly';

        const lbl = document.createElement('label');
        lbl.textContent = label;

        const a1 = document.createElement('span');
        a1.className = 'inspector-axis-label';
        a1.textContent = axes[0];

        const s1 = document.createElement('span');
        s1.className = 'inspector-axis-value';
        s1.textContent = v1;

        const a2 = document.createElement('span');
        a2.className = 'inspector-axis-label';
        a2.textContent = axes[1];

        const s2 = document.createElement('span');
        s2.className = 'inspector-axis-value';
        s2.textContent = v2;

        row.appendChild(lbl);
        row.appendChild(a1);
        row.appendChild(s1);
        row.appendChild(a2);
        row.appendChild(s2);

        if (tooltip) {
            row.addEventListener('mouseenter', () => TooltipManager.Instance?.Show(tooltip));
            row.addEventListener('mouseleave', () => TooltipManager.Instance?.Hide());
        }

        return row;
    }

    /** Builds a small text divider used to separate groups of sub-fields. */
    protected SubLabel(text: string): HTMLElement {
        const el = document.createElement('div');
        el.className = 'inspector-sub-label';
        el.textContent = text;
        return el;
    }

    /** Builds a compact inline boolean toggle with a label. */
    protected InlineBoolField(label: string, value: boolean, onChange: (v: boolean) => void): HTMLElement {
        const row = document.createElement('div');
        row.className = 'inspector-inline-bool';
        const lbl = document.createElement('span');
        lbl.className = 'inspector-inline-bool-label';
        lbl.textContent = label;
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = value;
        checkbox.addEventListener('change', () => onChange(checkbox.checked));
        row.appendChild(lbl);
        row.appendChild(checkbox);
        return row;
    }

    /** Returns true if value is a RandomBetweenTwo (has a 'first' key). */
    protected static IsRandom<T>(value: T | RandomBetweenTwo<T>): boolean {
        return typeof value === 'object' && value !== null && 'first' in (value as object);
    }

    /** Internal helper that builds the ± toggle wrapper used by all Random* and Range field types. */
    protected RandomFieldWrapper(
        label: string,
        isRange: boolean,
        onToggle: (isRange: boolean) => void,
        buildSingle: (container: HTMLElement) => void,
        buildRange: (container: HTMLElement) => void,
        tooltip?: string,
    ): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.className = 'inspector-random-group';

        const header = document.createElement('div');
        header.className = 'inspector-random-header';

        const lbl = document.createElement('span');
        lbl.className = 'inspector-sub-label';
        lbl.textContent = label;

        const modeBtn = document.createElement('button');
        modeBtn.className = `inspector-random-mode${isRange ? ' is-active' : ''}`;
        modeBtn.textContent = '±';

        let modeBtnTooltip = isRange ? 'Switch to constant' : 'Switch to random between two';
        modeBtn.addEventListener('mouseenter', () => TooltipManager.Instance?.Show(modeBtnTooltip));
        modeBtn.addEventListener('mouseleave', () => TooltipManager.Instance?.Hide());

        header.appendChild(lbl);
        header.appendChild(modeBtn);

        const singleDiv = document.createElement('div');
        singleDiv.className = 'inspector-random-single';
        buildSingle(singleDiv);

        const rangeDiv = document.createElement('div');
        rangeDiv.className = 'inspector-random-range';
        buildRange(rangeDiv);

        if (tooltip) {
            for (const el of [lbl, singleDiv, rangeDiv]) {
                el.addEventListener('mouseenter', () => TooltipManager.Instance?.Show(tooltip));
                el.addEventListener('mouseleave', () => TooltipManager.Instance?.Hide());
            }
        }

        singleDiv.style.display = isRange ? 'none' : '';
        rangeDiv.style.display = isRange ? '' : 'none';

        let current = isRange;
        modeBtn.addEventListener('click', () => {
            current = !current;
            modeBtn.classList.toggle('is-active', current);
            modeBtnTooltip = current ? 'Switch to constant' : 'Switch to random between two';
            singleDiv.style.display = current ? 'none' : '';
            rangeDiv.style.display = current ? '' : 'none';
            onToggle(current);
        });

        wrapper.appendChild(header);
        wrapper.appendChild(singleDiv);
        wrapper.appendChild(rangeDiv);
        return wrapper;
    }

    /** Builds a color field that supports either a constant color or a random-between-two range. */
    protected RandomColorField(
        label: string,
        getValue: () => Color | RandomBetweenTwo<Color>,
        onChange: (v: Color | RandomBetweenTwo<Color>) => void,
        tooltip?: string,
    ): HTMLElement {
        const [first, second] = Utils.RandomBetweenTwo(getValue());
        return this.RandomFieldWrapper(
            label,
            ComponentField.IsRandom(getValue()),
            (toRange) => {
                const [f] = Utils.RandomBetweenTwo(getValue());
                onChange(toRange ? { first: f, second: f } : f);
            },
            (c) => {
                c.appendChild(new ColorPickerControl(first, v => onChange(v)).element);
            },
            (c) => {
                c.appendChild(this.SubLabel('A'));
                c.appendChild(new ColorPickerControl(first, v => {
                    const [, s] = Utils.RandomBetweenTwo(getValue());
                    onChange({ first: v, second: s });
                }).element);
                c.appendChild(this.SubLabel('B'));
                c.appendChild(new ColorPickerControl(second, v => {
                    const [f] = Utils.RandomBetweenTwo(getValue());
                    onChange({ first: f, second: v });
                }).element);
            },
            tooltip,
        );
    }

    /** Builds a number field that supports either a constant value or a random-between-two range. */
    protected RandomNumberField(
        label: string,
        getValue: () => number | RandomBetweenTwo<number>,
        onChange: (v: number | RandomBetweenTwo<number>) => void,
        tooltip?: string,
    ): HTMLElement {
        const [first, second] = Utils.RandomBetweenTwo(getValue());
        return this.RandomFieldWrapper(
            label,
            ComponentField.IsRandom(getValue()),
            (toRange) => {
                const [f] = Utils.RandomBetweenTwo(getValue());
                onChange(toRange ? { first: f, second: f } : f);
            },
            (c) => {
                c.appendChild(this.NumberField('', first, v => onChange(v)));
            },
            (c) => {
                c.appendChild(this.NumberField('A', first, v => {
                    const [, s] = Utils.RandomBetweenTwo(getValue());
                    onChange({ first: v, second: s });
                }));
                c.appendChild(this.NumberField('B', second, v => {
                    const [f] = Utils.RandomBetweenTwo(getValue());
                    onChange({ first: f, second: v });
                }));
            },
            tooltip,
        );
    }

    /** Builds a start/end range field that supports either a constant or a random-between-two. */
    protected RandomStartEndField(
        label: string,
        getValue: () => { start: number; end: number } | RandomBetweenTwo<{ start: number; end: number }>,
        onChange: (v: { start: number; end: number } | RandomBetweenTwo<{ start: number; end: number }>) => void,
        tooltip?: string,
    ): HTMLElement {
        const [first, second] = Utils.RandomBetweenTwo(getValue());
        return this.RandomFieldWrapper(
            label,
            ComponentField.IsRandom(getValue()),
            (toRange) => {
                const [f] = Utils.RandomBetweenTwo(getValue());
                onChange(toRange ? { first: f, second: f } : f);
            },
            (c) => {
                c.appendChild(this.NumberField('Start', first.start, v => {
                    const [f] = Utils.RandomBetweenTwo(getValue());
                    onChange({ start: v, end: f.end });
                }));
                c.appendChild(this.NumberField('End', first.end, v => {
                    const [f] = Utils.RandomBetweenTwo(getValue());
                    onChange({ start: f.start, end: v });
                }));
            },
            (c) => {
                c.appendChild(this.SubLabel('A'));
                c.appendChild(this.NumberField('Start', first.start, v => {
                    const [f, s] = Utils.RandomBetweenTwo(getValue());
                    onChange({ first: { start: v, end: f.end }, second: s });
                }));
                c.appendChild(this.NumberField('End', first.end, v => {
                    const [f, s] = Utils.RandomBetweenTwo(getValue());
                    onChange({ first: { start: f.start, end: v }, second: s });
                }));
                c.appendChild(this.SubLabel('B'));
                c.appendChild(this.NumberField('Start', second.start, v => {
                    const [f, s] = Utils.RandomBetweenTwo(getValue());
                    onChange({ first: f, second: { start: v, end: s.end } });
                }));
                c.appendChild(this.NumberField('End', second.end, v => {
                    const [f, s] = Utils.RandomBetweenTwo(getValue());
                    onChange({ first: f, second: { start: s.start, end: v } });
                }));
            },
            tooltip,
        );
    }

    /** Builds a Vec2 field that supports either a constant or a random-between-two. */
    protected RandomVec2Field(
        label: string,
        getValue: () => Vec2 | RandomBetweenTwo<Vec2>,
        onChange: (v: Vec2 | RandomBetweenTwo<Vec2>) => void,
        tooltip?: string,
    ): HTMLElement {
        const [first, second] = Utils.RandomBetweenTwo(getValue());
        return this.RandomFieldWrapper(
            label,
            ComponentField.IsRandom(getValue()),
            (toRange) => {
                const [f] = Utils.RandomBetweenTwo(getValue());
                onChange(toRange ? { first: f, second: f } : f);
            },
            (c) => {
                c.appendChild(this.Vec2Field('', first, v => onChange(v)));
            },
            (c) => {
                c.appendChild(this.Vec2Field('A', first, v => {
                    const [, s] = Utils.RandomBetweenTwo(getValue());
                    onChange({ first: v, second: s });
                }));
                c.appendChild(this.Vec2Field('B', second, v => {
                    const [f] = Utils.RandomBetweenTwo(getValue());
                    onChange({ first: f, second: v });
                }));
            },
            tooltip,
        );
    }

    /** Builds a number field that supports either a constant or a min/max range. */
    protected NumberRangeField(
        label: string,
        getValue: () => number | NumberRange,
        onChange: (v: number | NumberRange) => void,
        tooltip?: string,
    ): HTMLElement {
        const value = getValue();
        const isRange = typeof value !== 'number';
        const single = isRange ? value.min : value;
        const rangeMin = isRange ? value.min : value;
        const rangeMax = isRange ? value.max : value;
        return this.RandomFieldWrapper(
            label,
            isRange,
            (toRange) => {
                const current = getValue();
                if (toRange) {
                    const n = typeof current === 'number' ? current : current.min;
                    onChange({ min: n, max: n });
                } else {
                    onChange(typeof current === 'number' ? current : current.min);
                }
            },
            (c) => {
                c.appendChild(this.NumberField('', single, v => onChange(v)));
            },
            (c) => {
                c.appendChild(this.NumberField('Min', rangeMin, v => {
                    const current = getValue();
                    const max = typeof current === 'number' ? current : current.max;
                    onChange({ min: v, max });
                }));
                c.appendChild(this.NumberField('Max', rangeMax, v => {
                    const current = getValue();
                    const min = typeof current === 'number' ? current : current.min;
                    onChange({ min, max: v });
                }));
            },
            tooltip,
        );
    }
}
