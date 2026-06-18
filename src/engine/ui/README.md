<!-- HIERARCHY_START -->
[Nitrate](../README.md) / Ui
<!-- HIERARCHY_END -->
# UI

Panel and control system for the engine editor.

Add [`UserInterfaceManager`](UserInterfaceManager.ts) to a scene to activate the UI layer. It creates the required docket elements that panels mount into.

Panels are built on [`CollapsiblePanel`](CollapsiblePanel.ts). Add [`Hierarchy`](Hierarchy.ts) to a scene to get the game object list and [`Inspector`](Inspector.ts) — the inspector is owned and driven by the hierarchy. [`Resources`](Resources.ts) provides a file browser backed by the native resources API.

[`Modal`](Modal.ts) provides static helpers for overlays — use `Modal.Show()` for arbitrary content or `Modal.Confirm()` for a confirm/cancel prompt.

Control settings are defined using the interfaces in [`UserInterfaceTypes.ts`](UserInterfaceTypes.ts) — `RangeSetting`, `ChoiceSetting`, `ButtonSetting`, and so on all extend `BaseSetting`.

<!-- API_START -->
---

## API

### [`CollapsiblePanel`](CollapsiblePanel.ts)
Creates a collapsible, resizable, draggable UI panel and appends it to the provided parent element.

Specific panels are created via their respective classes, and use this parent class to instantiate.

| Interfaces & Types |
|--------------------|
```ts
interface CollapsiblePanelParams {
    label?: string;
    parent?: HTMLElement;
    collapsed?: boolean;
    style?: Partial<CSSStyleDeclaration>;
}
```

| Method | Description |
|--------|-------------|
| [`IsCollapsed(): boolean`](CollapsiblePanel.ts) | Returns true if the panel is currently collapsed. |
| [`SetCollapsed(collapsed: boolean): void`](CollapsiblePanel.ts) | Sets the collapsed state of the panel. Stashes and restores height around collapse. |
| [`AddSection(label?: string): HTMLElement`](CollapsiblePanel.ts) | Adds a new section to the panel body. Auto-hides if no content is appended synchronously. |

---

### [`Hierarchy`](Hierarchy.ts)
Scene hierarchy panel.
Lists all game objects in the scene, handles selection, rename, reorder, and delete.
Also owns and drives the [`Inspector`](Inspector.ts) for the currently selected object.

```ts
new Nitrate.Hierarchy();
```

| Interfaces & Types |
|--------------------|
```ts
interface AddHierarchyObjectParams {
    name?: string;
    components?: Array<new () => Component>;
}
```

| Method | Description |
|--------|-------------|
| [`GetSelectedGameObject(): GameObject \| null`](Hierarchy.ts) | Returns the currently selected game object, or null if nothing is selected. |
| [`Clear(): void`](Hierarchy.ts) | Removes all game objects and deselects the current selection. |
| [`Refresh(): void`](Hierarchy.ts) | Re-renders the hierarchy list and refreshes the inspector for the current selection. |
| [`AddHierarchyObject(params: AddHierarchyObjectParams): void`](Hierarchy.ts) | Creates a new game object with the given components, adds it to the hierarchy, and selects it. |

---

### [`Inspector`](Inspector.ts)
Component inspector panel.

Displays and edits the name and component fields of the currently selected game object.
No need to instantiate, created and managed by Hierarchy.

| Method | Description |
|--------|-------------|
| [`Show(go: GameObject, onNameChange?: () => void): void`](Inspector.ts) | Displays the inspector for the given game object, showing the name input and rendering all component fields. |
| [`Hide(): void`](Inspector.ts) | Clears the inspector and hides all UI elements. |

---

### [`Loader`](Loader.ts)
Creates a spinner element. Append wherever a loading indicator is needed.

```ts
const loader = new Loader();
someContainer.appendChild(loader.element);
```


---

### [`Modal`](Modal.ts)
Utility class for displaying modal overlays.

```ts
const confirmed = await Modal.Confirm({ title, confirmLabel: 'Confirm', cancelLabel: 'Cancel' });
if (!confirmed) { return; }
```

| Interfaces & Types |
|--------------------|
```ts
interface ModalOptions {
    title: string;
    confirmLabel?: string;
    cancelLabel?: string;
}
```

| Method | Description |
|--------|-------------|
| [`static Show(content: HTMLElement): { close: () => void }`](Modal.ts) | Mounts arbitrary content in a centered modal overlay. Returns a handle to close it programmatically. |
| [`static Confirm(options: ModalOptions): Promise<boolean>`](Modal.ts) | Shows a confirm/cancel modal with a title. Resolves true if confirmed, false if cancelled or dismissed. |

---

### [`NotificationManager`](NotificationManager.ts)
Manages a toast notification stack anchored at the bottom-center of the screen.
Instantiated by UserInterfaceManager. Callers pass `duration: 0` for persistent toasts
that require an explicit click to dismiss.

```ts
NotificationManager.Instance?.Notify({ message: 'Export complete!', level: 'success', duration: 4000 });
NotificationManager.Instance?.Notify({ title: 'Export Failed', message: 'Invalid material in margin.', level: 'error', duration: 0 });
```

| Interfaces & Types |
|--------------------|
```ts
interface NotificationOptions {
    message: string;
    level?: NotificationLevel;
    title?: string;
    duration: number;
    action?: { label: string; onClick: () => void };
}
```

| Method | Description |
|--------|-------------|
| [`Notify(options: NotificationOptions): void`](NotificationManager.ts) | Builds and shows a notification. If the stack is full the oldest notification is immediately evicted to make room. |

---

### [`Resources`](Resources.ts)
File browser panel for the editor.
Renders two root sections — Shipped (read-only, import only) and a user assets folder (full operations).
Requires the Electron resources and userdata APIs.


---

### [`TooltipManager`](TooltipManager.ts)
Manages a single persistent tooltip overlay. Controls call Show/Hide on hover.
Instantiated by UserInterfaceManager — the engine handles its lifecycle.

```ts
element.addEventListener('mouseenter', () => HintManager.Instance?.Show('Brush size in cells.'));
element.addEventListener('mouseleave', () => HintManager.Instance?.Hide());
```

| Method | Description |
|--------|-------------|
| [`Show(text: string): void`](TooltipManager.ts) | — |
| [`Hide(): void`](TooltipManager.ts) | — |

---

### [`UserInterfaceManager`](UserInterfaceManager.ts)
Creates the full-screen UI layer that all panels float within.
Add to a scene to activate the UI layer for that scene.

```ts
new Nitrate.UserInterfaceManager();
```


---

### [`UserInterfaceRegistry`](UserInterfaceRegistry.ts)
Maps UI control type strings to their `ControlHandler` implementations.
Controls register themselves at startup; panels resolve handlers at build time.


---

### [`UserInterfaceTypes`](UserInterfaceTypes.ts)

| Interfaces & Types |
|--------------------|
```ts
type UISetting =
    | ActionGroupSetting
    | SelectSetting
    | RangeSetting
    | ChoiceSetting
    | ButtonSetting
    | PaletteSetting
    | TextSetting
    | ToggleGroupSetting
    | ToggleListSetting
```

```ts
interface BaseSetting {
    id: string;
    label?: string;
    tooltip?: string;
}
```

```ts
interface RangeSetting extends BaseSetting {
    type: 'range';
    min: number;
    max: number;
    step: number;
    default: number;
    suffix: string;
    decimals: number;
    readout: boolean;
    normalize?: 'percent';
    integer?: boolean;
}
```

```ts
interface ChoiceSetting extends BaseSetting {
    type: 'choice';
    default: string;
    options: ReadonlyArray<{ value: string; label: string; tooltip?: string }>;
    hideLabel?: boolean;
}
```

```ts
interface ActionGroupSetting extends BaseSetting {
    type: 'actionGroup';
    options: ReadonlyArray<{ value: string; label: string; icon: string; tooltip?: string }>;
}
```

```ts
interface ButtonSetting extends BaseSetting {
    type: 'button';
    label: string;
    action: string;
    variant?: 'danger' | 'warn';
}
```

```ts
interface PaletteSetting extends BaseSetting {
    type: 'palette';
    count: number;
    default: number;
}
```

```ts
interface SelectSetting extends BaseSetting {
    type: 'select';
    default: number;
    options: ReadonlyArray<{ value: number; label: string }>;
}
```

```ts
interface TextSetting extends BaseSetting {
    type: 'text';
    placeholder?: string;
    default: string;
}
```

```ts
interface ToggleGroupSetting extends BaseSetting {
    type: 'toggleGroup';
    options: ReadonlyArray<{ value: string; label: string; tooltip?: string }>;
    default: readonly string[];
}
```

```ts
interface ToggleListSetting extends BaseSetting {
    type: 'toggleList';
    options: ReadonlyArray<{ value: string; label: string; tooltip?: string }>;
    default: readonly string[];
}
```

---

<!-- API_END -->

<!-- TABLE_OF_CONTENTS_START -->
## Table of Contents

[`controls/`](controls/README.md)  
[`fields/`](fields/README.md)  
[`panels/`](panels/README.md)  

<!-- TABLE_OF_CONTENTS_END -->
