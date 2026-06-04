import type { ResourcesPreviewPanelParams } from './panels/ResourcesPreviewPanel';

import { CollapsiblePanel } from './CollapsiblePanel';
import { ComponentRegistry } from '../component/ComponentRegistry';
import { LogManager } from '../debug/LogManager';
import { Metadata } from '../game_object/Metadata';
import { NitrateProcess } from '../NitrateProcess';
import { ResourcesPreviewPanel } from './panels/ResourcesPreviewPanel';
import { UserInterfaceConfig } from '../config/UserInterfaceConfig';
import { UserInterfaceManager } from './UserInterfaceManager';

const componentIconMap = new Map<string, string>();
for (const Component of ComponentRegistry.Components) {
    const icon = (Component as unknown as { icon?: string }).icon;
    if (!icon) {
        LogManager.Instance?.LogWarning({
            text: 'Icon not available for ' + Component.label,
            options: { tags: ["Resources"] }
        });
        continue;
    }
    const tmp = new Component();
    componentIconMap.set(tmp.type, icon);
}

interface FileNode {
    type: 'file';
    name: string;
    path: string;
}

interface FolderNode {
    type: 'folder';
    name: string;
    path: string;
    children: TreeNode[];
}

type TreeNode = FileNode | FolderNode;

interface ContextTarget {
    isFolder: boolean;
    path: string;
    labelEl: HTMLElement;
    isUserdata: boolean;
}

interface ResourcesParams {
    onImport?: (path: string) => void;
    style?: Partial<CSSStyleDeclaration>;
    collapsed?: boolean;
    previewPanel?: ResourcesPreviewPanelParams;
}

/**
 * File browser panel for the editor.
 * Renders two root sections — Shipped (read-only, import only) and a user assets folder (full operations).
 * Requires the Electron resources and userdata APIs.
 */
export class Resources extends NitrateProcess {
    public static Instance: Resources | null = null;

    private readonly panel: CollapsiblePanel;
    private readonly body: HTMLElement;
    private readonly contextMenu: HTMLElement;
    private readonly fileDataCache = new Map<string, string[]>();
    private readonly fileIconStrips = new Map<string, HTMLElement>();
    private readonly openFolders = new Set<string>();
    private readonly folderChildLists = new Map<string, HTMLElement>();
    private readonly folderOpeners = new Map<string, () => void>();

    private pollHandle: number | null = null;
    private readonly pollInterval: number = 1000;
    private lastHash: string = '';
    private rowIndex: number = 0;
    private dragPath: string | null = null;
    private dragIsUserdata: boolean = false;
    private contextTarget: ContextTarget | null = null;
    private userdataLabel: string = 'MyAssets';
    private selectedPath: string | null = null;
    private selectedIsUserdata: boolean = false;
    private selectedEntry: HTMLElement | null = null;

    private readonly previewPanel: ResourcesPreviewPanel;
    private readonly docClickHandler = () => { this.HideContextMenu(); };
    private readonly docContextMenuHandler = () => { this.HideContextMenu(); };
    private readonly onImport: ((path: string) => void) | undefined;

    constructor(options: ResourcesParams = {}) {
        super();
        Resources.Instance = this;
        this.onImport = options.onImport;
        this.previewPanel = new ResourcesPreviewPanel(options.previewPanel);

        const defaults = UserInterfaceConfig.GetConfig().defaults.resources;
        this.panel = new CollapsiblePanel({
            label: 'Resources',
            parent: UserInterfaceManager.Instance?.panelContent,
            collapsed: options?.collapsed ?? defaults.collapsed,
            style: { ...defaults.style, ...options?.style }
        });

        this.body = document.createElement('div');
        this.body.className = 'resources-body';
        this.panel.body.appendChild(this.body);

        this.contextMenu = document.createElement('div');
        this.contextMenu.className = 'resources-context-menu';
        this.contextMenu.addEventListener('click', (e) => { e.stopPropagation(); });
        this.contextMenu.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); });
        document.body.appendChild(this.contextMenu);

        document.addEventListener('click', this.docClickHandler);
        document.addEventListener('contextmenu', this.docContextMenuHandler);

        void this.InitPolling();
    }

    private CacheKey(path: string, isUserdata: boolean): string {
        return `${isUserdata ? 'u' : 'r'}:${path}`;
    }

    private FolderKey(path: string, isUserdata: boolean): string {
        return `${isUserdata ? 'u' : 'r'}:${path}`;
    }

    private SectionKey(label: string, isUserdata: boolean): string {
        return this.FolderKey(`__section__:${label}`, isUserdata);
    }

    private ApiFor(isUserdata: boolean): typeof window.api.resources {
        return isUserdata ? window.api.userdata : window.api.resources;
    }

    private async InitPolling(): Promise<void> {
        this.userdataLabel = await window.api.userdata.label().catch(() => 'MyAssets');

        const [shippedPaths, userdataPaths] = await Promise.all([
            window.api.resources.list().then(p => p.sort()),
            window.api.userdata.list().then(p => p.sort()),
        ]);

        this.lastHash = [...shippedPaths, '||', ...userdataPaths].join('|');
        this.RenderPaths(shippedPaths, userdataPaths);

        this.pollHandle = window.setInterval(() => { void this.Poll(); }, this.pollInterval);
    }

    private async Poll(): Promise<void> {
        try {
            const [shippedPaths, userdataPaths] = await Promise.all([
                window.api.resources.list().then(p => p.sort()),
                window.api.userdata.list().then(p => p.sort()),
            ]);
            const hash = [...shippedPaths, '||', ...userdataPaths].join('|');
            if (hash === this.lastHash) { return; }
            this.lastHash = hash;
            LogManager.Instance?.Log({
                text: `File list changed, re-rendering (${shippedPaths.length + userdataPaths.length} paths).`,
                options: { tags: ['Resources'], noisy: true },
            });
            this.RenderPaths(shippedPaths, userdataPaths);
        } catch {
            LogManager.Instance?.LogWarning({
                text: 'Poll failed — resources API unavailable.',
                options: { tags: ['Resources'] },
            });
        }
    }

    private RenderPaths(shippedPaths: string[], userdataPaths: string[]): void {
        this.rowIndex = 0;
        this.body.innerHTML = '';
        this.fileIconStrips.clear();
        this.folderChildLists.clear();
        this.folderOpeners.clear();
        this.selectedEntry = null;

        this.body.appendChild(this.BuildSection('Shipped', shippedPaths, false));
        this.body.appendChild(this.BuildSection(this.userdataLabel, userdataPaths, true));

        void this.LoadFileData(shippedPaths, false);
        void this.LoadFileData(userdataPaths, true);
    }

    private BuildSection(label: string, paths: string[], isUserdata: boolean): HTMLElement {
        const section = document.createElement('div');
        section.className = 'resources-section';

        const rowClass = this.rowIndex++ % 2 === 0 ? 'row-even' : 'row-odd';
        const header = document.createElement('div');
        header.className = `resources-folder-header ${rowClass}`;

        const chevron = document.createElement('span');
        chevron.className = 'resources-folder-chevron';
        chevron.textContent = '▸';
        header.appendChild(chevron);

        const labelEl = document.createElement('span');
        labelEl.className = 'resources-folder-label';
        labelEl.textContent = label;
        header.appendChild(labelEl);

        if (!isUserdata) {
            const lock = document.createElement('span');
            lock.className = 'resources-section-lock';
            header.appendChild(lock);
        }

        let children: HTMLElement;
        if (paths.length === 0) {
            children = document.createElement('div');
            children.className = 'resources-empty';
            children.textContent = isUserdata ? 'No custom assets yet.' : 'No shipped assets found.';
        } else {
            children = this.BuildTreeElement(this.BuildTree(paths), [], isUserdata);
        }

        const sectionKey = this.SectionKey(label, isUserdata);
        this.folderChildLists.set(sectionKey, children);

        const startOpen = this.openFolders.has(sectionKey);
        children.style.display = startOpen ? '' : 'none';
        if (startOpen) { chevron.classList.add('is-open'); chevron.textContent = '▾'; }

        header.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).tagName === 'INPUT') { return; }
            const open = chevron.classList.toggle('is-open');
            chevron.textContent = open ? '▾' : '▸';
            children.style.display = open ? '' : 'none';
            this.openFolders[open ? 'add' : 'delete'](sectionKey);
        });

        header.addEventListener('dragover', (e) => {
            if (!this.dragPath || this.dragIsUserdata !== isUserdata) { return; }
            e.preventDefault();
            e.stopPropagation();
            header.classList.add('drop-target');
        });
        header.addEventListener('dragleave', (e) => {
            if (header.contains(e.relatedTarget as Node)) { return; }
            header.classList.remove('drop-target');
        });
        header.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            header.classList.remove('drop-target');
            const from = this.dragPath;
            if (!from || this.dragIsUserdata !== isUserdata) { return; }
            this.dragPath = null;
            const filename = from.split('/').pop() ?? '';
            if (from !== filename) { void this.Move(from, filename, isUserdata); }
        });

        if (isUserdata || import.meta.env.DEV) {
            header.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.contextTarget = null;
                this.ShowContextMenu(e.clientX, e.clientY, '', isUserdata);
            });

            children.addEventListener('contextmenu', (e) => {
                if ((e.target as HTMLElement).closest('.resources-entry, .resources-folder-header')) { return; }
                e.preventDefault();
                e.stopPropagation();
                this.contextTarget = null;
                this.ShowContextMenu(e.clientX, e.clientY, '', isUserdata);
            });
        }

        children.addEventListener('dragover', (e) => {
            if (!this.dragPath || this.dragIsUserdata !== isUserdata) { return; }
            e.preventDefault();
            children.classList.add('drop-target');
        });
        children.addEventListener('dragleave', (e) => {
            if (children.contains(e.relatedTarget as Node)) { return; }
            children.classList.remove('drop-target');
        });
        children.addEventListener('drop', (e) => {
            e.preventDefault();
            children.classList.remove('drop-target');
            const from = this.dragPath;
            if (!from || this.dragIsUserdata !== isUserdata) { return; }
            this.dragPath = null;
            const filename = from.split('/').pop() ?? '';
            if (from !== filename) { void this.Move(from, filename, isUserdata); }
        });

        section.appendChild(header);
        section.appendChild(children);
        return section;
    }

    private BuildTree(relativePaths: string[]): TreeNode[] {
        const root: FolderNode = { type: 'folder', name: '', path: '', children: [] };

        for (const relative of relativePaths) {
            const isDir = relative.endsWith('/');
            const cleanPath = isDir ? relative.slice(0, -1) : relative;
            const parts = cleanPath.split('/');
            let current = root;
            let currentPath = '';

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const isLastPart = i === parts.length - 1;
                currentPath = currentPath ? `${currentPath}/${part}` : part;

                if (isLastPart && !isDir) {
                    current.children.push({ type: 'file', name: part.replace(/\.json$/, ''), path: cleanPath });
                } else {
                    let folder = current.children.find(
                        (n): n is FolderNode => n.type === 'folder' && n.name === part
                    );
                    if (!folder) {
                        folder = { type: 'folder', name: part, path: currentPath, children: [] };
                        current.children.push(folder);
                    }
                    if (!isLastPart) { current = folder; }
                }
            }
        }

        return root.children;
    }

    private async LoadFileData(paths: string[], isUserdata: boolean): Promise<void> {
        const api = this.ApiFor(isUserdata);
        for (const path of paths) {
            if (path.endsWith('/')) { continue; }
            const cacheKey = this.CacheKey(path, isUserdata);
            if (this.fileDataCache.has(cacheKey)) { continue; }
            try {
                const content = await api.read(path);
                const data = JSON.parse(content) as { components?: Array<{ type: string }> };
                const types = (data.components ?? []).map(c => c.type).filter(Boolean);
                this.fileDataCache.set(cacheKey, types);
                this.RenderIconStrip(path, isUserdata, types);
            } catch { /* ignore */ }
        }
    }

    private RenderIconStrip(path: string, isUserdata: boolean, types: string[]): void {
        const strip = this.fileIconStrips.get(this.CacheKey(path, isUserdata));
        if (!strip) { return; }
        strip.innerHTML = '';
        for (const type of types) {
            const iconUrl = componentIconMap.get(type);
            if (!iconUrl) { continue; }
            const icon = document.createElement('span');
            icon.className = 'resources-entry-icon';
            icon.style.backgroundImage = `url(${iconUrl})`;
            strip.appendChild(icon);
        }
    }

    private BuildTreeElement(nodes: TreeNode[], parentIsLast: boolean[], isUserdata: boolean): HTMLElement {
        const list = document.createElement('div');
        list.className = 'resources-list';
        const sorted = [...nodes].sort((a, b) => {
            if (a.type !== b.type) { return a.type === 'folder' ? -1 : 1; }
            return a.name.localeCompare(b.name);
        });
        for (let i = 0; i < sorted.length; i++) {
            const node = sorted[i];
            const isLast = i === sorted.length - 1;
            list.appendChild(
                node.type === 'folder'
                    ? this.BuildFolder(node, isLast, parentIsLast, isUserdata)
                    : this.BuildFile(node, isLast, parentIsLast, isUserdata)
            );
        }
        return list;
    }

    private BuildConnectors(parentIsLast: boolean[], isLast: boolean): HTMLElement {
        const wrap = document.createElement('span');
        wrap.className = 'resources-connectors';

        for (const anIsLast of parentIsLast) {
            const span = document.createElement('span');
            span.className = anIsLast
                ? 'resources-connector-indent'
                : 'resources-connector-indent has-continue';
            wrap.appendChild(span);
        }

        const branch = document.createElement('span');
        branch.className = isLast
            ? 'resources-connector-branch'
            : 'resources-connector-branch is-continuing';
        wrap.appendChild(branch);

        return wrap;
    }

    private BuildFolder(
        node: FolderNode, isLast: boolean, parentIsLast: boolean[], isUserdata: boolean
    ): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.className = 'resources-folder';

        const rowClass = this.rowIndex++ % 2 === 0 ? 'row-even' : 'row-odd';
        const header = document.createElement('div');
        header.className = `resources-folder-header ${rowClass}`;

        header.appendChild(this.BuildConnectors(parentIsLast, isLast));

        const chevron = document.createElement('span');
        chevron.className = 'resources-folder-chevron';
        chevron.textContent = '▸';
        header.appendChild(chevron);

        const label = document.createElement('span');
        label.className = 'resources-folder-label';
        label.textContent = node.name;
        header.appendChild(label);

        const children = this.BuildTreeElement(node.children, [...parentIsLast, isLast], isUserdata);
        const folderKey = this.FolderKey(node.path, isUserdata);
        this.folderChildLists.set(folderKey, children);

        const startOpen = this.openFolders.has(folderKey);
        children.style.display = startOpen ? '' : 'none';
        if (startOpen) { chevron.classList.add('is-open'); chevron.textContent = '▾'; }

        const openFolder = () => {
            if (this.openFolders.has(folderKey)) { return; }
            chevron.classList.add('is-open');
            chevron.textContent = '▾';
            children.style.display = '';
            this.openFolders.add(folderKey);
        };
        this.folderOpeners.set(folderKey, openFolder);

        header.draggable = true;
        header.addEventListener('dragstart', (e) => {
            this.dragPath = node.path;
            this.dragIsUserdata = isUserdata;
            e.dataTransfer?.setData('text/plain', node.path);
            e.stopPropagation();
            header.classList.add('is-dragging');
        });
        header.addEventListener('dragend', () => {
            this.dragPath = null;
            this.dragIsUserdata = false;
            header.classList.remove('is-dragging');
        });

        header.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).tagName === 'INPUT') { return; }
            const open = chevron.classList.toggle('is-open');
            chevron.textContent = open ? '▾' : '▸';
            children.style.display = open ? '' : 'none';
            this.openFolders[open ? 'add' : 'delete'](folderKey);
        });

        if (isUserdata || import.meta.env.DEV) {
            header.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.contextTarget = { isFolder: true, path: node.path, labelEl: label, isUserdata };
                this.ShowContextMenu(e.clientX, e.clientY, node.path, isUserdata);
            });
        }

        header.addEventListener('dragover', (e) => {
            if (!this.dragPath || this.dragIsUserdata !== isUserdata) { return; }
            e.preventDefault();
            e.stopPropagation();
            header.classList.add('drop-target');
        });
        header.addEventListener('dragleave', (e) => {
            if (header.contains(e.relatedTarget as Node)) { return; }
            header.classList.remove('drop-target');
        });
        header.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            header.classList.remove('drop-target');
            const from = this.dragPath;
            if (!from || this.dragIsUserdata !== isUserdata) { return; }
            this.dragPath = null;
            const filename = from.split('/').pop() ?? '';
            const to = node.path ? `${node.path}/${filename}` : filename;
            if (from !== to) { void this.Move(from, to, isUserdata); }
        });

        wrapper.appendChild(header);
        wrapper.appendChild(children);
        return wrapper;
    }

    private BuildFile(
        node: FileNode, isLast: boolean, parentIsLast: boolean[], isUserdata: boolean
    ): HTMLElement {
        const rowClass = this.rowIndex++ % 2 === 0 ? 'row-even' : 'row-odd';
        const entry = document.createElement('div');
        entry.className = `resources-entry ${rowClass}`;
        entry.draggable = true;

        entry.appendChild(this.BuildConnectors(parentIsLast, isLast));

        const label = document.createElement('span');
        label.className = 'resources-entry-label';
        label.textContent = node.name;
        entry.appendChild(label);

        const iconStrip = document.createElement('span');
        iconStrip.className = 'resources-entry-icons';
        entry.appendChild(iconStrip);
        this.fileIconStrips.set(this.CacheKey(node.path, isUserdata), iconStrip);

        const cached = this.fileDataCache.get(this.CacheKey(node.path, isUserdata));
        if (cached) { this.RenderIconStrip(node.path, isUserdata, cached); }

        if (this.selectedPath === node.path && this.selectedIsUserdata === isUserdata) {
            entry.classList.add('is-selected');
            this.selectedEntry = entry;
        }

        entry.addEventListener('click', () => {
            this.selectedEntry?.classList.remove('is-selected');
            this.selectedPath = node.path;
            this.selectedIsUserdata = isUserdata;
            this.selectedEntry = entry;
            entry.classList.add('is-selected');
            this.previewPanel.OnSelect(node.path, isUserdata);
        });

        entry.addEventListener('dragstart', (e) => {
            this.dragPath = node.path;
            this.dragIsUserdata = isUserdata;
            e.dataTransfer?.setData('text/plain', node.path);
            entry.classList.add('is-dragging');

            document.dispatchEvent(new CustomEvent('resource-drag-start', {
                detail: { path: node.path, isUserdata }
            }));

            if (node.path.endsWith('.json')) {
                const ghostCanvas = document.createElement('canvas');
                ghostCanvas.width = 1;
                ghostCanvas.height = 1;
                e.dataTransfer?.setDragImage(ghostCanvas, 0, 0);
            }
        });
        entry.addEventListener('dragend', () => {
            this.dragPath = null;
            this.dragIsUserdata = false;
            entry.classList.remove('is-dragging');
            document.dispatchEvent(new CustomEvent('resource-drag-end'));
        });

        entry.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.contextTarget = { isFolder: false, path: node.path, labelEl: label, isUserdata };
            this.ShowContextMenu(e.clientX, e.clientY, undefined, isUserdata);
        });

        return entry;
    }

    private ShowContextMenu(
        x: number, y: number, newFolderParent?: string, isUserdata?: boolean
    ): void {
        this.contextMenu.innerHTML = '';
        this.contextMenu.classList.add('is-open');

        const canMutate = isUserdata || import.meta.env.DEV;

        if (this.contextTarget) {
            if (!this.contextTarget.isFolder && this.onImport) {
                const importBtn = document.createElement('button');
                importBtn.textContent = 'Import';
                importBtn.addEventListener('click', () => {
                    const target = this.contextTarget;
                    this.HideContextMenu();
                    if (target) { this.onImport!(target.path); }
                });
                this.contextMenu.appendChild(importBtn);
            }

            if (canMutate) {
                const renameBtn = document.createElement('button');
                renameBtn.textContent = 'Rename';
                renameBtn.addEventListener('click', () => {
                    const target = this.contextTarget;
                    this.HideContextMenu();
                    if (target) { this.StartRename(target); }
                });
                this.contextMenu.appendChild(renameBtn);

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'is-danger';
                deleteBtn.textContent = 'Delete';
                deleteBtn.addEventListener('click', () => {
                    const target = this.contextTarget;
                    this.HideContextMenu();
                    if (target) { void this.Delete(target.path, target.isUserdata); }
                });
                this.contextMenu.appendChild(deleteBtn);
            }
        }

        if (newFolderParent !== undefined && (isUserdata || import.meta.env.DEV)) {
            const newFolderBtn = document.createElement('button');
            newFolderBtn.textContent = 'New Folder';
            newFolderBtn.addEventListener('click', () => {
                const parent = newFolderParent;
                this.HideContextMenu();
                this.StartNewFolder(parent, isUserdata ?? false);
            });
            this.contextMenu.appendChild(newFolderBtn);
        }

        const menuWidth = this.contextMenu.offsetWidth;
        const menuHeight = this.contextMenu.offsetHeight;
        this.contextMenu.style.left = `${Math.min(x, window.innerWidth - menuWidth - 4)}px`;
        this.contextMenu.style.top = `${Math.min(y, window.innerHeight - menuHeight - 4)}px`;
    }

    private HideContextMenu(): void {
        this.contextMenu.classList.remove('is-open');
        this.contextTarget = null;
    }

    private StartRename(target: ContextTarget): void {
        const { path, labelEl, isFolder, isUserdata } = target;
        const oldName = labelEl.textContent ?? '';
        const parent = labelEl.parentElement;
        if (!parent) { return; }

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'resources-rename-input';
        input.value = oldName;
        parent.replaceChild(input, labelEl);
        input.focus();
        input.select();

        let committed = false;
        const commit = async () => {
            if (committed) { return; }
            committed = true;
            const newName = input.value.trim();
            parent.replaceChild(labelEl, input);
            if (!newName || newName === oldName) { return; }
            const parts = path.split('/');
            const ext = path.match(/\.(\w+)\.json$/)?.[1];
            parts[parts.length - 1] = isFolder ? newName : ext ? `${newName}.${ext}.json` : `${newName}.json`;
            await this.Move(path, parts.join('/'), isUserdata);
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { void commit(); }
            if (e.key === 'Escape') { committed = true; parent.replaceChild(labelEl, input); }
        });
        input.addEventListener('blur', () => { void commit(); });
    }

    private StartNewFolder(parentPath: string, isUserdata: boolean = true): void {
        const containerKey = parentPath === ''
            ? this.SectionKey(isUserdata ? this.userdataLabel : 'Shipped', isUserdata)
            : this.FolderKey(parentPath, isUserdata);

        if (parentPath !== '') {
            this.folderOpeners.get(containerKey)?.();
        }

        const container = this.folderChildLists.get(containerKey) ?? null;
        if (!container) { return; }

        const tempRow = document.createElement('div');
        tempRow.className = 'resources-new-folder-row';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'resources-rename-input';
        input.placeholder = 'folder name';
        tempRow.appendChild(input);
        container.appendChild(tempRow);
        tempRow.scrollIntoView({ block: 'nearest' });
        input.focus();

        let committed = false;
        const commit = async () => {
            if (committed) { return; }
            committed = true;
            tempRow.remove();
            const name = input.value.trim();
            if (!name) { return; }
            const folderPath = parentPath ? `${parentPath}/${name}` : name;
            await this.MakeDirectory(folderPath, isUserdata);
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { void commit(); }
            if (e.key === 'Escape') { committed = true; tempRow.remove(); }
        });
        input.addEventListener('blur', () => { void commit(); });
    }

    private async Move(from: string, to: string, isUserdata: boolean): Promise<void> {
        await this.ApiFor(isUserdata).move(from, to).catch(() => null);
        await this.ApiFor(isUserdata).move(Metadata.GetMetaPath(from), Metadata.GetMetaPath(to)).catch(() => null);

        const fromKey = this.CacheKey(from, isUserdata);
        const toKey = this.CacheKey(to, isUserdata);
        const cached = this.fileDataCache.get(fromKey);
        if (cached !== undefined) {
            this.fileDataCache.delete(fromKey);
            this.fileDataCache.set(toKey, cached);
            LogManager.Instance?.Log({
                text: `Moved resource from: ${from} to: ${to}`,
                options: { tags: ["Resources"] }
            });
        }
    }

    private async Delete(path: string, isUserdata: boolean): Promise<void> {
        await this.ApiFor(isUserdata).delete(path).catch(() => null);
        await this.ApiFor(isUserdata).delete(Metadata.GetMetaPath(path)).catch(() => null);
        this.fileDataCache.delete(this.CacheKey(path, isUserdata));
        LogManager.Instance?.Log({
            text: `Deleted path: ${path}`,
            options: { tags: ["Resources"] }
        });
    }

    /** Clears the icon cache for a file and re-reads it. Call after overwriting an existing asset. @internal */
    public async InvalidateFile(path: string): Promise<void> {
        const userdataKey = this.CacheKey(path, true);
        const resourcesKey = this.CacheKey(path, false);
        const isUserdata = this.fileDataCache.has(userdataKey);
        this.fileDataCache.delete(userdataKey);
        this.fileDataCache.delete(resourcesKey);
        await this.LoadFileData([path], isUserdata);
    }

    private async MakeDirectory(path: string, isUserdata: boolean): Promise<void> {
        await this.ApiFor(isUserdata).mkdir(path).catch(() => null);
        LogManager.Instance?.Log({
            text: `Directory created: ${path}`,
            options: { tags: ["Resources"] }
        });
    }

    public OnDestroy(): void {
        if (this.pollHandle !== null) { window.clearInterval(this.pollHandle); }

        document.removeEventListener('click', this.docClickHandler);
        document.removeEventListener('contextmenu', this.docContextMenuHandler);

        this.previewPanel.OnDestroy();
        this.panel.OnDestroy();
        this.contextMenu.remove();

        if (Resources.Instance === this) {
            Resources.Instance = null;
            LogManager.Instance?.Log({
                text: 'Cleared Resources singleton instance.',
                options: { tags: ["Resources", "NitrateProcessDestroy"] }
            });
        }
    }
}
