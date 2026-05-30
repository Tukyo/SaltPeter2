import type { AnyComponent } from '../component/Component';
import type { ComponentField } from './fields/ComponentField';

import { ComponentFieldRegistry } from './fields/ComponentFieldRegistry';
import { ComponentRegistry } from '../component/ComponentRegistry';
import { GameObject } from '../game_object/GameObject';
import { LogManager } from '../debug/LogManager';
import { NitrateProcess } from '../NitrateProcess';
import { Transform } from '../component/definitions/transform/Transform';
import { UserInterfaceManager } from './UserInterfaceManager';

/**
 * Component inspector panel.
 * 
 * Displays and edits the name and component fields of the currently selected game object.
 * No need to instantiate, created and managed by Hierarchy.
 */
export class Inspector extends NitrateProcess {
    private readonly container: HTMLElement;
    private readonly nameInput: HTMLInputElement;
    private readonly componentList: HTMLElement;
    private readonly addComponentWrapper: HTMLElement;

    private gameObject: GameObject | null = null;
    private onNameChange: (() => void) | null = null;

    constructor() {
        super();

        this.container = document.createElement('div');
        this.container.className = 'inspector';
        UserInterfaceManager.Instance?.inspectorDocket.appendChild(this.container);

        const header = document.createElement('div');
        header.className = 'inspector-header';

        const title = document.createElement('h2');
        title.className = 'inspector-title';
        title.textContent = 'Inspector';
        header.appendChild(title);

        this.nameInput = document.createElement('input');
        this.nameInput.type = 'text';
        this.nameInput.className = 'inspector-name-input';
        this.nameInput.addEventListener('input', () => {
            if (this.gameObject) {
                this.gameObject.name = this.nameInput.value;
                this.onNameChange?.();
            }
        });
        header.appendChild(this.nameInput);

        this.container.appendChild(header);

        this.componentList = document.createElement('div');
        this.componentList.className = 'inspector-component-list';

        this.addComponentWrapper = this.BuildAddComponentButton();

        const body = document.createElement('div');
        body.className = 'inspector-body';
        body.appendChild(this.componentList);
        body.appendChild(this.addComponentWrapper);
        this.container.appendChild(body);
    }

    /** Displays the inspector for the given game object, showing the name input and rendering all component fields. */
    public Show(go: GameObject, onNameChange?: () => void): void {
        this.gameObject = go;
        this.onNameChange = onNameChange ?? null;

        this.nameInput.value = go.name;
        this.nameInput.style.display = '';
        this.addComponentWrapper.style.display = '';

        this.Render();

        LogManager.Instance?.Log({
            text: 'Inspector shown.',
            options: { tags: ['Inspector'] },
        });
    }

    /** Clears the inspector and hides all UI elements. */
    public Hide(): void {
        this.gameObject = null;
        this.onNameChange = null;

        this.nameInput.value = '';
        this.nameInput.style.display = 'none';
        this.addComponentWrapper.style.display = 'none';
        this.componentList.innerHTML = '';

        LogManager.Instance?.Log({
            text: 'Inspector hidden.',
            options: { tags: ['Inspector'] },
        });
    }

    /** Clears and rebuilds the component field list for the current game object. */
    private Render(): void {
        if (!this.gameObject) { return; }
        this.componentList.innerHTML = '';
        const elements: HTMLElement[] = [];
        for (const component of this.gameObject.components) {
            const onRemove = () => {
                if (!this.gameObject) { return; }
                this.gameObject.components = this.gameObject.components.filter(c => c !== component);
                this.Render();
            };
            const field = this.CreateField(component, onRemove);
            if (!field) { continue; }
            const el = field.element;
            this.componentList.appendChild(el);
            elements.push(el);
        }
        this.SetupDragReorder(elements);
    }

    /** Wires drag-and-drop reorder behavior onto rendered component field elements. Transform is always locked to index 0. */
    private SetupDragReorder(elements: HTMLElement[]): void {
        if (elements.length <= 1) return;

        let dragSrcIndex = -1;
        let highlighted: HTMLElement | null = null;
        let highlightCls = '';

        const clearHighlight = () => {
            if (highlighted) { highlighted.classList.remove(highlightCls); highlighted = null; highlightCls = ''; }
        };

        const setHighlight = (el: HTMLElement, cls: 'drop-above' | 'drop-below') => {
            if (highlighted === el && highlightCls === cls) { return; }
            clearHighlight();
            el.classList.add(cls);
            highlighted = el;
            highlightCls = cls;
        };

        for (let i = 1; i < elements.length; i++) {
            const el = elements[i];
            const idx = i;
            const header = el.querySelector('.inspector-component-header') as HTMLElement | null;
            if (!header) { continue; }

            header.draggable = true;

            header.addEventListener('dragstart', (e) => {
                dragSrcIndex = idx;
                if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; }
                setTimeout(() => { el.classList.add('is-dragging'); }, 0);
            });

            header.addEventListener('dragend', () => {
                el.classList.remove('is-dragging');
                clearHighlight();
                dragSrcIndex = -1;
            });
        }

        for (let i = 0; i < elements.length; i++) {
            const el = elements[i];
            const idx = i;

            el.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (dragSrcIndex === -1) return;
                if (idx === 0) {
                    setHighlight(el, 'drop-below');
                } else {
                    const rect = el.getBoundingClientRect();
                    setHighlight(el, e.clientY < rect.top + rect.height / 2 ? 'drop-above' : 'drop-below');
                }
            });

            el.addEventListener('drop', (e) => {
                e.preventDefault();
                if (dragSrcIndex === -1 || !this.gameObject) { return; }
                clearHighlight();

                let insertAt: number;
                if (idx === 0) {
                    insertAt = 1;
                } else {
                    const rect = el.getBoundingClientRect();
                    const before = e.clientY < rect.top + rect.height / 2;
                    insertAt = before ? idx : idx + 1;
                    if (dragSrcIndex < insertAt) { insertAt--; }
                    insertAt = Math.max(1, insertAt);
                }

                if (insertAt === dragSrcIndex) { dragSrcIndex = -1; return; }

                const components = [...this.gameObject.components];
                const [dragged] = components.splice(dragSrcIndex, 1);
                components.splice(insertAt, 0, dragged);
                this.gameObject.components = components;
                this.Render();
            });
        }

        this.componentList.addEventListener('dragleave', (e) => {
            if (!this.componentList.contains(e.relatedTarget as Node)) { clearHighlight(); }
        });
    }

    /** Finds and instantiates the registered field class for a component. Returns null if no field is registered for the component type. */
    private CreateField(component: AnyComponent, onRemove: () => void): ComponentField | null {
        const FieldClass = ComponentFieldRegistry.Fields.get(component.type);
        if (!FieldClass) {
            LogManager.Instance?.LogWarning({
                text: `No field registered for component type: ${component.type}`,
                options: { tags: ['Inspector'] },
            });
        }
        return FieldClass ? new FieldClass(component, onRemove) : null;
    }

    /** Builds the Add Component button and dropdown, populated from the component registry. */
    private BuildAddComponentButton(): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.className = 'inspector-add-component';

        const btn = document.createElement('button');
        btn.className = 'inspector-add-component-btn';
        btn.textContent = 'Add Component';

        const dropdown = document.createElement('div');
        dropdown.className = 'inspector-add-component-dropdown';

        btn.addEventListener('click', () => { dropdown.classList.toggle('is-open'); });

        for (const component of [...ComponentRegistry.Components].sort((a, b) => a.label.localeCompare(b.label))) {
            if (component === Transform) { continue; }
            const option = document.createElement('button');
            option.textContent = component.label;
            option.addEventListener('click', () => {
                if (!this.gameObject) { return; }
                this.gameObject.AddComponent(component);
                dropdown.classList.remove('is-open');
                this.Render();
            });
            dropdown.appendChild(option);
        }

        wrapper.appendChild(btn);
        wrapper.appendChild(dropdown);
        return wrapper;
    }

    public OnDestroy(): void {
        this.container.remove();
    }
}
