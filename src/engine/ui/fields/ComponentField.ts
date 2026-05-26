import type { AnyComponent } from '../../component/Component';
import type { ComponentConstructor } from '../../component/ComponentRegistry';
import type { Vec2 } from '../../definitions/Primitives';

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
        header.addEventListener('click', () => { section.classList.toggle('is-collapsed'); });

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
        section.appendChild(fields);

        this.element = section;
    }

    /** Implemented by subclasses to populate the fields container with input rows for the component's properties. */
    protected abstract BuildFields(container: HTMLElement): void;


    /** Builds a single labeled number input row. */
    protected NumberField(label: string, value: number, onChange: (v: number) => void): HTMLElement {
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

        return row;
    }

    /** Builds a labeled two-axis vector input row. */
    protected Vec2Field(label: string, value: Vec2, onChange: (v: Vec2) => void, axes: [string, string] = ['X', 'Y'],): HTMLElement {
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

        return row;
    }

    /** Builds a labeled dropdown select row. */
    protected SelectField(label: string, value: string, options: string[], onChange: (v: string) => void,): HTMLElement {
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

        return row;
    }

    /** Builds a labeled checkbox row. */
    protected BoolField(label: string, value: boolean, onChange: (v: boolean) => void): HTMLElement {
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

        return row;
    }

    /** Builds a read-only labeled text row. */
    protected ReadOnlyField(label: string, value: string): HTMLElement {
        const row = document.createElement('div');
        row.className = 'inspector-field inspector-field-readonly';

        const lbl = document.createElement('label');
        lbl.textContent = label;

        const span = document.createElement('span');
        span.textContent = value;

        row.appendChild(lbl);
        row.appendChild(span);

        return row;
    }

    /** Builds a read-only labeled two-axis vector display row. */
    protected ReadOnlyVec2Field(label: string, axes: [string, string], v1: string, v2: string): HTMLElement {
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

        return row;
    }
}
