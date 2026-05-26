import { ComponentRegistry } from '../component/ComponentRegistry';
import { LogManager } from '../debug/LogManager';
import { NitrateProcess } from '../NitrateProcess';
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
}

interface ResourcesParams {
    onImport?: (path: string) => void;
}

/**
 * File browser panel for the editor.
 * Polls the native resources API for changes and renders a tree of folders and files with import, rename, delete, and drag-drop.
 * Requires the Electron resources API — not applicable outside the editor context.
 */
export class Resources extends NitrateProcess {
    public static Instance: Resources | null = null;

    private readonly container: HTMLElement;
    private readonly body: HTMLElement;
    private readonly contextMenu: HTMLElement;
    private readonly fileDataCache = new Map<string, string[]>();
    private readonly fileIconStrips = new Map<string, HTMLElement>();
    private readonly openFolders = new Set<string>();
    private readonly folderChildLists = new Map<string, HTMLElement>();
    private readonly folderOpeners = new Map<string, () => void>();

    private pollHandle: number | null = null;
    private pollInterval: number = 1000;
    private lastHash: string = '';
    private rowIndex: number = 0;
    private dragPath: string | null = null;
    private contextTarget: ContextTarget | null = null;
    private rootChildList: HTMLElement | null = null;

    private readonly docClickHandler = () => { this.HideContextMenu(); };
    private readonly docContextMenuHandler = () => { this.HideContextMenu(); };
    private readonly onImport: ((path: string) => void) | undefined;

    constructor(options: ResourcesParams = {}) {
        super();
        Resources.Instance = this;
        this.onImport = options.onImport;

        this.container = document.createElement('div');
        this.container.className = 'resources';
        UserInterfaceManager.Instance?.resourcesDocket.appendChild(this.container);

        const header = document.createElement('div');
        header.className = 'resources-header';
        const title = document.createElement('h2');
        title.className = 'resources-title';
        title.textContent = 'Resources';
        header.appendChild(title);
        this.container.appendChild(header);

        this.body = document.createElement('div');
        this.body.className = 'resources-body';
        this.container.appendChild(this.body);

        this.contextMenu = document.createElement('div');
        this.contextMenu.className = 'resources-context-menu';
        this.contextMenu.addEventListener('click', (e) => { e.stopPropagation(); });
        this.contextMenu.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); });
        document.body.appendChild(this.contextMenu);

        document.addEventListener('click', this.docClickHandler);
        document.addEventListener('contextmenu', this.docContextMenuHandler);

        this.body.addEventListener('contextmenu', (e) => {
            if ((e.target as HTMLElement).closest('.resources-entry, .resources-folder-header')) { return; }
            e.preventDefault();
            e.stopPropagation();
            this.contextTarget = null;
            this.ShowContextMenu(e.clientX, e.clientY, '');
        });

        this.body.addEventListener('dragover', (e) => {
            if (!this.dragPath) { return; }
            e.preventDefault();
            this.body.classList.add('drop-target');
        });
        this.body.addEventListener('dragleave', (e) => {
            if (this.body.contains(e.relatedTarget as Node)) { return; }
            this.body.classList.remove('drop-target');
        });
        this.body.addEventListener('drop', (e) => {
            e.preventDefault();
            this.body.classList.remove('drop-target');
            const from = this.dragPath;
            if (!from) { return; }
            this.dragPath = null;
            const filename = from.split('/').pop() ?? '';
            if (from !== filename) { void this.Move(from, filename); }
        });

        void this.InitPolling();
    }

    /** Fetches the initial file list, sets the baseline hash, renders the tree, and starts the poll interval. */
    private async InitPolling(): Promise<void> {
        const paths = (await window.api.resources.list()).sort();
        this.lastHash = paths.join('|');
        this.RenderPaths(paths);
        this.pollHandle = window.setInterval(() => {
            void this.Poll();
        }, this.pollInterval);
    }

    /** Checks the resource API for file list changes every tick; re-renders if the list has changed. */
    private async Poll(): Promise<void> {
        try {
            const paths = (await window.api.resources.list()).sort();
            const hash = paths.join('|');
            if (hash === this.lastHash) { return; }
            this.lastHash = hash;
            LogManager.Instance?.Log({
                text: `File list changed, re-rendering (${paths.length} paths).`,
                options: { tags: ['Resources'], noisy: true },
            });
            this.RenderPaths(paths);
        } catch {
            LogManager.Instance?.LogWarning({
                text: 'Poll failed — resources API unavailable.',
                options: { tags: ['Resources'] },
            });
        }
    }

    /** Clears and fully rebuilds the tree DOM from a flat sorted list of resource paths. */
    private RenderPaths(paths: string[]): void {
        this.rowIndex = 0;
        this.body.innerHTML = '';
        this.fileIconStrips.clear();
        this.folderChildLists.clear();
        this.folderOpeners.clear();

        if (paths.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'resources-empty';
            empty.textContent = 'No resources found.';
            this.body.appendChild(empty);
            this.rootChildList = null;
            return;
        }

        const rootList = this.BuildTreeElement(this.BuildTree(paths), []);
        this.rootChildList = rootList;
        this.body.appendChild(rootList);
        void this.LoadFileData(paths);
    }

    /** Converts a flat list of relative paths into a nested TreeNode hierarchy. */
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

    /** Reads each uncached file, extracts its component type list, and updates the icon strip. Skips folders and already-cached paths. */
    private async LoadFileData(paths: string[]): Promise<void> {
        for (const path of paths) {
            if (path.endsWith('/') || this.fileDataCache.has(path)) { continue; }
            try {
                const content = await window.api.resources.read(path);
                const data = JSON.parse(content) as { components?: Array<{ type: string }> };
                const types = (data.components ?? []).map(c => c.type).filter(Boolean);
                this.fileDataCache.set(path, types);
                this.RenderIconStrip(path, types);
            } catch { /* ignore */ }
        }
    }

    /** Populates the icon strip element for a given path from a list of component type strings. */
    private RenderIconStrip(path: string, types: string[]): void {
        const strip = this.fileIconStrips.get(path);
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

    /** Builds a sorted div containing DOM rows for a list of tree nodes, folders first. */
    private BuildTreeElement(nodes: TreeNode[], parentIsLast: boolean[]): HTMLElement {
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
                    ? this.BuildFolder(node, isLast, parentIsLast)
                    : this.BuildFile(node, isLast, parentIsLast)
            );
        }
        return list;
    }

    /** Builds the indent-guide and branch connector spans for a tree row. */
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

    /** Builds a folder row with a chevron toggle, context menu, and drag-drop target. */
    private BuildFolder(node: FolderNode, isLast: boolean, parentIsLast: boolean[]): HTMLElement {
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

        const children = this.BuildTreeElement(node.children, [...parentIsLast, isLast]);
        this.folderChildLists.set(node.path, children);

        const startOpen = this.openFolders.has(node.path);
        children.style.display = startOpen ? '' : 'none';
        if (startOpen) { chevron.classList.add('is-open'); chevron.textContent = '▾'; }

        const openFolder = () => {
            if (this.openFolders.has(node.path)) { return; }
            chevron.classList.add('is-open');
            chevron.textContent = '▾';
            children.style.display = '';
            this.openFolders.add(node.path);
        };
        this.folderOpeners.set(node.path, openFolder);

        header.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).tagName === 'INPUT') { return; }
            const open = chevron.classList.toggle('is-open');
            chevron.textContent = open ? '▾' : '▸';
            children.style.display = open ? '' : 'none';
            this.openFolders[open ? 'add' : 'delete'](node.path);
        });

        header.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.contextTarget = { isFolder: true, path: node.path, labelEl: label };
            this.ShowContextMenu(e.clientX, e.clientY, node.path);
        });

        header.addEventListener('dragover', (e) => {
            if (!this.dragPath) { return; }
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
            if (!from) { return; }
            this.dragPath = null;
            const filename = from.split('/').pop() ?? '';
            const to = node.path ? `${node.path}/${filename}` : filename;
            if (from !== to) { void this.Move(from, to); }
        });

        wrapper.appendChild(header);
        wrapper.appendChild(children);
        return wrapper;
    }

    /** Builds a file row with a label, icon strip, drag handle, and context menu. */
    private BuildFile(node: FileNode, isLast: boolean, parentIsLast: boolean[]): HTMLElement {
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
        this.fileIconStrips.set(node.path, iconStrip);

        const cached = this.fileDataCache.get(node.path);
        if (cached) { this.RenderIconStrip(node.path, cached); }

        entry.addEventListener('dragstart', (e) => {
            this.dragPath = node.path;
            e.dataTransfer?.setData('text/plain', node.path);
            entry.classList.add('is-dragging');
        });
        entry.addEventListener('dragend', () => {
            this.dragPath = null;
            this.body.classList.remove('drop-target');
            entry.classList.remove('is-dragging');
        });
        entry.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.contextTarget = { isFolder: false, path: node.path, labelEl: label };
            this.ShowContextMenu(e.clientX, e.clientY);
        });

        return entry;
    }

    /** Positions and populates the context menu at screen coordinates. Pass newFolderParent to include the New Folder action. */
    private ShowContextMenu(x: number, y: number, newFolderParent?: string): void {
        this.contextMenu.innerHTML = '';
        this.contextMenu.classList.add('is-open');

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
                if (target) { void this.Delete(target.path); }
            });
            this.contextMenu.appendChild(deleteBtn);
        }

        if (newFolderParent !== undefined) {
            const newFolderBtn = document.createElement('button');
            newFolderBtn.textContent = 'New Folder';
            newFolderBtn.addEventListener('click', () => {
                const parent = newFolderParent;
                this.HideContextMenu();
                this.StartNewFolder(parent);
            });
            this.contextMenu.appendChild(newFolderBtn);
        }

        this.contextMenu.style.left = `${Math.min(x, window.innerWidth - 168)}px`;
        this.contextMenu.style.top = `${Math.min(y, window.innerHeight - 90)}px`;
    }

    /** Hides the context menu and clears the context target. */
    private HideContextMenu(): void {
        this.contextMenu.classList.remove('is-open');
        this.contextTarget = null;
    }

    /** Replaces a label with an inline input to perform a rename. Commits on Enter or blur, cancels on Escape. */
    private StartRename(target: ContextTarget): void {
        const { path, labelEl, isFolder } = target;
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
            await this.Move(path, parts.join('/'));
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { void commit(); }
            if (e.key === 'Escape') { committed = true; parent.replaceChild(labelEl, input); }
        });
        input.addEventListener('blur', () => { void commit(); });
    }

    /** Injects a temporary input row for naming a new folder. Creates the folder on commit. */
    private StartNewFolder(parentPath: string): void {
        let container: HTMLElement | null;
        if (parentPath === '') {
            container = this.rootChildList ?? this.body;
        } else {
            this.folderOpeners.get(parentPath)?.();
            container = this.folderChildLists.get(parentPath) ?? null;
        }
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
            await this.MakeDirectory(folderPath);
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { void commit(); }
            if (e.key === 'Escape') { committed = true; tempRow.remove(); }
        });
        input.addEventListener('blur', () => { void commit(); });
    }

    /** Moves or renames a resource and updates the file data cache key. */
    private async Move(from: string, to: string): Promise<void> {
        await window.api.resources.move(from, to).catch(() => null);

        const cached = this.fileDataCache.get(from);
        if (cached !== undefined) {
            this.fileDataCache.delete(from);
            this.fileDataCache.set(to, cached);
            LogManager.Instance?.Log({
                text: 'Moved resource from: ' + from + ' to: ' + to,
                options: { tags: ["Resources"] }
            });
        }
    }

    /** Deletes a resource file or empty folder and removes it from the file data cache. */
    private async Delete(path: string): Promise<void> {
        await window.api.resources.delete(path).catch(() => null);

        this.fileDataCache.delete(path);
        LogManager.Instance?.Log({
            text: 'Deleted path: ' + path,
            options: { tags: ["Resources"] }
        });
    }

    /** Creates a new folder at the given relative path. */
    private async MakeDirectory(path: string): Promise<void> {
        await window.api.resources.mkdir(path).catch(() => null);

        LogManager.Instance?.Log({
            text: 'Directory created: ' + path,
            options: { tags: ["Resources"] }
        });
    }

    public OnDestroy(): void {
        if (this.pollHandle !== null) { window.clearInterval(this.pollHandle); }

        document.removeEventListener('click', this.docClickHandler);
        document.removeEventListener('contextmenu', this.docContextMenuHandler);

        this.container.remove();
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
