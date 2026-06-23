import type { Component } from '../component/Component';
import type { ComponentConstructor } from '../component/ComponentRegistry';
import type { ComponentField } from './fields/ComponentField';

import { CollapsiblePanel } from './CollapsiblePanel';
import { ComponentFieldRegistry } from './fields/ComponentFieldRegistry';
import { ComponentRegistry } from '../component/ComponentRegistry';
import { CustomComponent } from '../component/definitions/custom/Custom';
import { GameObject } from '../game_object/GameObject';
import { LogManager } from '../debug/LogManager';
import { NitrateProcess } from '../NitrateProcess';
import { Transform } from '../component/definitions/transform/Transform';
import { UserInterfaceConfig } from '../config/UserInterfaceConfig';
import { UserInterfaceManager } from './UserInterfaceManager';

interface InspectorPanelParams {
    style?: Partial<CSSStyleDeclaration>;
    collapsed?: boolean;
}

/**
 * Component inspector panel.
 *
 * Displays and edits the name and component fields of the currently selected game object.
 * No need to instantiate, created and managed by Hierarchy.
 */
export class Inspector extends NitrateProcess {
    private readonly panel: CollapsiblePanel;
    private readonly nameInput: HTMLInputElement;
    private readonly componentList: HTMLElement;
    private readonly addComponentWrapper: HTMLElement;

    private gameObject: GameObject | null = null;
    private onNameChange: (() => void) | null = null;

    constructor(params?: InspectorPanelParams) {
        super();
        this.Register();

        const defaults = UserInterfaceConfig.GetConfig().defaults.inspector;
        this.panel = new CollapsiblePanel({
            label: 'Inspector',
            parent: UserInterfaceManager.Instance?.panelContent,
            collapsed: params?.collapsed ?? defaults.collapsed,
            style: { ...defaults.style, ...params?.style }
        });
        this.panel.body.classList.add('inspector');

        this.nameInput = document.createElement('input');
        this.nameInput.type = 'text';
        this.nameInput.className = 'inspector-name-input';
        this.nameInput.addEventListener('input', () => {
            if (this.gameObject) {
                this.gameObject.name = this.nameInput.value;
                this.onNameChange?.();
            }
        });
        this.panel.body.appendChild(this.nameInput);

        this.componentList = document.createElement('div');
        this.componentList.className = 'inspector-component-list';

        this.addComponentWrapper = this.BuildAddComponentButton();

        const body = document.createElement('div');
        body.className = 'inspector-body';
        body.appendChild(this.componentList);
        body.appendChild(this.addComponentWrapper);
        this.panel.body.appendChild(body);
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
    private CreateField(component: Component, onRemove: () => void): ComponentField | null {
        const FieldClass = ComponentFieldRegistry.Fields.get(component.type);
        if (!FieldClass) {
            LogManager.Instance?.LogWarning({
                text: `No field registered for component type: ${component.type}`,
                options: { tags: ['Inspector'] },
            });
        }
        return FieldClass ? new FieldClass(component, onRemove) : null;
    }

    /** Builds the Add Component button and dropdown with category sections and search. */
    private BuildAddComponentButton(): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.className = 'inspector-add-component';

        const btn = document.createElement('button');
        btn.className = 'inspector-add-component-btn';
        btn.textContent = 'Add Component';

        const dropdown = document.createElement('div');
        dropdown.className = 'inspector-add-component-dropdown';

        const search = document.createElement('input');
        search.type = 'text';
        search.placeholder = 'Search...';
        search.className = 'inspector-add-component-search';

        const categoryContainer = document.createElement('div');

        const searchResults = document.createElement('div');
        searchResults.className = 'inspector-add-component-search-results';
        searchResults.style.display = 'none';

        dropdown.appendChild(search);
        dropdown.appendChild(categoryContainer);
        dropdown.appendChild(searchResults);

        btn.addEventListener('click', () => {
            const opening = !dropdown.classList.contains('is-open');
            dropdown.classList.toggle('is-open');
            if (opening) {
                search.value = '';
                categoryContainer.style.display = '';
                searchResults.style.display = 'none';
                searchResults.innerHTML = '';
                search.focus();
            }
        });

        const components = [...ComponentRegistry.Components]
            .filter(c => c !== Transform)
            .sort((a, b) => a.label.localeCompare(b.label));

        const categories = new Map<string, ComponentConstructor[]>();
        for (const component of components) {
            const category = Inspector.GetComponentCategory(component);
            if (!categories.has(category)) { categories.set(category, []); }
            const bucket = categories.get(category);
            if (bucket) { bucket.push(component); }
        }

        const sortedCategories = [...categories.keys()].sort((a, b) => {
            if (a === 'General') { return -1; }
            if (b === 'General') { return 1; }
            if (a === 'Custom') { return 1; }
            if (b === 'Custom') { return -1; }
            return a.localeCompare(b);
        });

        for (const category of sortedCategories) {
            const bucket = categories.get(category);
            if (!bucket) { continue; }
            categoryContainer.appendChild(this.BuildCategorySection(category, bucket, dropdown));
        }

        search.addEventListener('input', () => {
            const query = search.value.toLowerCase().trim();
            if (!query) {
                categoryContainer.style.display = '';
                searchResults.style.display = 'none';
                searchResults.innerHTML = '';
                return;
            }
            categoryContainer.style.display = 'none';
            searchResults.innerHTML = '';
            searchResults.style.display = '';
            for (const component of components.filter(c => c.label.toLowerCase().includes(query))) {
                searchResults.appendChild(this.BuildComponentOption(component, dropdown));
            }
        });

        wrapper.appendChild(btn);
        wrapper.appendChild(dropdown);
        return wrapper;
    }

    private static GetComponentCategory(component: ComponentConstructor): string {
        if ((component.prototype as object) instanceof CustomComponent) { return 'Custom'; }
        for (const [type, ctor] of ComponentRegistry.byType.entries()) {
            if (ctor !== component) { continue; }
            const FieldClass = ComponentFieldRegistry.Fields.get(type);
            const menu = (FieldClass as unknown as Record<string, unknown> | undefined)?.menu;
            return typeof menu === 'string' ? menu.split('/')[0] : 'General';
        }
        return 'General';
    }

    private BuildCategorySection(
        category: string,
        items: ComponentConstructor[],
        dropdown: HTMLElement
    ): HTMLElement {
        const section = document.createElement('div');
        section.className = 'inspector-add-component-category is-collapsed';

        const header = document.createElement('button');
        header.className = 'inspector-add-component-category-header';
        header.textContent = category;
        header.addEventListener('click', () => { section.classList.toggle('is-collapsed'); });

        const itemsEl = document.createElement('div');
        itemsEl.className = 'inspector-add-component-category-items';
        for (const component of items) {
            itemsEl.appendChild(this.BuildComponentOption(component, dropdown));
        }

        section.appendChild(header);
        section.appendChild(itemsEl);
        return section;
    }

    private BuildComponentOption(component: ComponentConstructor, dropdown: HTMLElement): HTMLElement {
        const option = document.createElement('button');
        option.className = 'inspector-add-component-option';
        option.textContent = component.label;
        option.addEventListener('click', () => {
            if (!this.gameObject) { return; }
            this.gameObject.AddComponent(component);
            dropdown.classList.remove('is-open');
            this.Render();
        });
        return option;
    }

    public OnDestroy(): void {
        this.panel.OnDestroy();
    }
}
