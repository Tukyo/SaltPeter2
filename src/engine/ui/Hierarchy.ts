import type { AnyComponent } from '../component/Component';

import { CollapsiblePanel } from './CollapsiblePanel';
import { GameObject } from '../game_object/GameObject';
import { Inspector } from './Inspector';
import { LogManager } from '../debug/LogManager';
import { NitrateProcess } from '../NitrateProcess';
import { SceneManager } from '../scene/SceneManager';
import { Transform } from '../component/definitions/transform/Transform';
import { UserInterfaceConfig } from '../config/UserInterfaceConfig';
import { UserInterfaceManager } from './UserInterfaceManager';

interface HierarchyPanelParams {
    style?: Partial<CSSStyleDeclaration>;
    collapsed?: boolean;
}

export interface AddHierarchyObjectParams {
    name?: string;
    components?: Array<new () => AnyComponent>;
}

/**
 * Scene hierarchy panel.
 * Lists all game objects in the scene, handles selection, rename, reorder, and delete.
 * Also owns and drives the {@link Inspector} for the currently selected object.
 *
 * ```ts
 * new Nitrate.Hierarchy();
 * ```
 */
export class Hierarchy extends NitrateProcess {
    public static Instance: Hierarchy | null = null;

    private readonly panel: CollapsiblePanel;
    private readonly list: HTMLElement;
    private readonly contextMenu: HTMLElement;
    private readonly inspector: Inspector;
    private readonly gameObjects: GameObject[] = [];

    private selectedGameObject: GameObject | null = null;

    private readonly onDocumentClick: () => void;

    constructor(params?: HierarchyPanelParams) {
        super();

        const defaults = UserInterfaceConfig.GetConfig().defaults.hierarchy;
        this.panel = new CollapsiblePanel({
            label: 'Hierarchy',
            parent: UserInterfaceManager.Instance?.panelContent,
            collapsed: params?.collapsed ?? defaults.collapsed,
            style: { ...defaults.style, ...params?.style }
        });
        this.panel.body.classList.add('hierarchy');

        this.list = document.createElement('div');
        this.list.className = 'hierarchy-list';
        this.list.addEventListener('contextmenu', (e) => { this.ShowContextMenu(e); });
        this.panel.body.appendChild(this.list);

        this.contextMenu = this.BuildContextMenu();

        this.onDocumentClick = () => { this.HideContextMenu(); };
        document.addEventListener('click', this.onDocumentClick);

        this.inspector = new Inspector();
        this.inspector.Hide();

        Hierarchy.Instance = this;
    }

    /** Returns the currently selected game object, or null if nothing is selected. */
    public GetSelectedGameObject(): GameObject | null {
        return this.selectedGameObject;
    }

    /** Removes all game objects and deselects the current selection. */
    public Clear(): void {
        this.gameObjects.splice(0, this.gameObjects.length);
        this.Select(null);
    }

    /** Re-renders the hierarchy list and refreshes the inspector for the current selection. */
    public Refresh(): void {
        this.Render();
        if (this.selectedGameObject) {
            this.inspector.Show(this.selectedGameObject, () => { this.Render(); });
        }
    }

    /** Creates a new game object with the given components, adds it to the hierarchy, and selects it. */
    public AddHierarchyObject(params: AddHierarchyObjectParams): void {
        const go = new GameObject(this.gameObjects.length, params.name ?? 'New Object');
        go.AddComponent(Transform);
        for (const Component of params.components ?? []) {
            if (Component === Transform) { continue; }
            go.AddComponent(Component);
        }
        this.gameObjects.push(go);
        LogManager.Instance?.Log({
            text: `Added game object to hierarchy: ${go.name}`,
            options: { tags: ['Hierarchy'] },
        });

        SceneManager.MarkDirty();
        this.Render();
        this.Select(go);
    }

    /** Sets the active selection, shows or hides the inspector accordingly, and re-renders the list. */
    private Select(go: GameObject | null): void {
        this.selectedGameObject = go;
        if (go) {
            this.inspector.Show(go, () => { this.Render(); });
        } else {
            this.inspector.Hide();
        }
        this.Render();
    }

    /** Clears and rebuilds the hierarchy list DOM from the current game objects array. */
    private Render(): void {
        this.list.innerHTML = '';
        const elements: HTMLElement[] = [];
        for (const go of this.gameObjects) {
            const entry = this.BuildEntry(go);
            this.list.appendChild(entry);
            elements.push(entry);
        }
        this.SetupDragReorder(elements);
    }

    /** Builds a single hierarchy entry row for a game object, with click, double-click, and context menu handlers. */
    private BuildEntry(go: GameObject): HTMLElement {
        const entry = document.createElement('div');
        entry.className = 'hierarchy-entry' + (go === this.selectedGameObject ? ' is-selected' : '');
        entry.textContent = go.name;
        entry.addEventListener('click', () => { this.Select(go); });
        entry.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            const idx = this.gameObjects.indexOf(go);
            const liveEntry = idx >= 0 ? (this.list.children[idx] as HTMLElement | undefined) : null;
            if (liveEntry) { this.StartRename(go, liveEntry); }
        });
        entry.addEventListener('contextmenu', (e) => { this.ShowContextMenu(e, go); });
        return entry;
    }

    /** Replaces an entry's label with an inline input for renaming. Commits on Enter or blur, cancels on Escape. */
    private StartRename(go: GameObject, entry: HTMLElement): void {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'hierarchy-entry-rename';
        input.value = go.name;

        let committed = false;

        const commit = () => {
            if (committed) { return; }
            committed = true;
            const newName = input.value.trim();
            if (newName) { go.name = newName; }
            if (go === this.selectedGameObject) {
                this.inspector.Show(go, () => { this.Render(); });
            }
            this.Render();
        };

        input.addEventListener('blur', commit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                commit();
            } else if (e.key === 'Escape') {
                committed = true;
                this.Render();
            }
        });

        entry.textContent = '';
        entry.appendChild(input);
        input.focus();
        input.select();
    }

    /** Wires drag-and-drop reorder behavior onto a rendered set of entry elements. */
    private SetupDragReorder(elements: HTMLElement[]): void {
        if (elements.length <= 1) { return; }

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

        for (let i = 0; i < elements.length; i++) {
            const el = elements[i];
            const idx = i;
            el.draggable = true;

            el.addEventListener('dragstart', (e) => {
                dragSrcIndex = idx;
                if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; }
                setTimeout(() => { el.classList.add('is-dragging'); }, 0);
            });

            el.addEventListener('dragend', () => {
                el.classList.remove('is-dragging');
                clearHighlight();
                dragSrcIndex = -1;
            });

            el.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (dragSrcIndex === -1) { return; }
                const rect = el.getBoundingClientRect();
                setHighlight(el, e.clientY < rect.top + rect.height / 2 ? 'drop-above' : 'drop-below');
            });

            el.addEventListener('drop', (e) => {
                e.preventDefault();
                if (dragSrcIndex === -1) { return; }
                clearHighlight();

                const rect = el.getBoundingClientRect();
                const before = e.clientY < rect.top + rect.height / 2;
                let insertAt = before ? idx : idx + 1;
                if (dragSrcIndex < insertAt) { insertAt--; }

                if (insertAt === dragSrcIndex) { dragSrcIndex = -1; return; }

                const gos = [...this.gameObjects];
                const [dragged] = gos.splice(dragSrcIndex, 1);
                gos.splice(insertAt, 0, dragged);
                this.gameObjects.splice(0, this.gameObjects.length, ...gos);
                this.Render();
            });
        }

        this.list.addEventListener('dragleave', (e) => {
            if (!this.list.contains(e.relatedTarget as Node)) { clearHighlight(); }
        });
    }

    /** Positions and populates the context menu. Shows object actions when a GameObject is targeted, or a create action when targeting the background. */
    private ShowContextMenu(e: MouseEvent, go?: GameObject): void {
        e.preventDefault();
        e.stopPropagation();
        this.contextMenu.innerHTML = '';

        if (go) {
            const renameBtn = document.createElement('button');
            renameBtn.textContent = 'Rename';
            renameBtn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                this.HideContextMenu();
                const idx = this.gameObjects.indexOf(go);
                const liveEntry = idx >= 0 ? (this.list.children[idx] as HTMLElement | undefined) : null;
                if (liveEntry) { this.StartRename(go, liveEntry); }
            });
            this.contextMenu.appendChild(renameBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'is-danger';
            deleteBtn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                this.HideContextMenu();
                const idx = this.gameObjects.indexOf(go);
                if (idx >= 0) { this.gameObjects.splice(idx, 1); }
                if (this.selectedGameObject === go) { this.Select(null); }
                else { this.Render(); }
                SceneManager.MarkDirty();
                LogManager.Instance?.Log({
                    text: `Removed game object from hierarchy: ${go.name}`,
                    options: { tags: ['Hierarchy'] },
                });
            });
            this.contextMenu.appendChild(deleteBtn);
        } else {
            const goBtn = document.createElement('button');
            goBtn.textContent = 'Game Object';
            goBtn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                this.AddHierarchyObject({});
                this.HideContextMenu();
            });
            this.contextMenu.appendChild(goBtn);
        }

        this.contextMenu.style.left = `${Math.min(e.clientX, window.innerWidth - 168)}px`;
        this.contextMenu.style.top = `${Math.min(e.clientY, window.innerHeight - 90)}px`;
        this.contextMenu.classList.add('is-open');
    }

    /** Hides the context menu. */
    private HideContextMenu(): void {
        this.contextMenu.classList.remove('is-open');
    }

    /** Creates and mounts the context menu element. */
    private BuildContextMenu(): HTMLElement {
        const menu = document.createElement('div');
        menu.className = 'hierarchy-context-menu';
        document.body.appendChild(menu);

        menu.addEventListener('click', (e) => { e.stopPropagation(); });
        menu.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); });

        return menu;
    }

    public OnDestroy(): void {
        this.panel.OnDestroy();
        this.contextMenu.remove();
        document.removeEventListener('click', this.onDocumentClick);

        if (Hierarchy.Instance === this) {
            Hierarchy.Instance = null;
            LogManager.Instance?.Log({
                text: 'Cleared Hierarchy singleton instance.',
                options: { tags: ['Hierarchy', 'NitrateProcessDestroy'] }
            });
        }
    }
}
