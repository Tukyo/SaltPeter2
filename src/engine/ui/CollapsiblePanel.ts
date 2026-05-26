import { NitrateProcess } from "../NitrateProcess";

export interface CollapsiblePanelParams {
    label?: string;
    parent?: HTMLElement;
    defaultCollapsed?: boolean;
}

/**
 * Creates a collapsible UI panel and appends it to the provided parent element.
 * 
 * Specific panels are created via their respective classes, and use this parent class to instantiate.
 */
export class CollapsiblePanel extends NitrateProcess {
    private readonly section: HTMLElement;
    private readonly header: HTMLButtonElement;
    public readonly body: HTMLElement;

    constructor(params: CollapsiblePanelParams) {
        super();

        const { label, parent, defaultCollapsed = false } = params;

        this.section = document.createElement('section');
        this.section.className = 'ui-panel';

        this.header = document.createElement('button');
        this.header.className = 'panel-header';
        this.header.type = 'button';
        this.header.textContent = label ?? "No Label Provided";

        this.body = document.createElement('div');
        this.body.className = 'panel-body';

        this.header.addEventListener('click', () => {
            this.SetCollapsed(!this.IsCollapsed());
        });

        this.section.appendChild(this.header);
        this.section.appendChild(this.body);
        parent?.appendChild(this.section);

        this.SetCollapsed(defaultCollapsed);
    }

    /** Returns true if the panel is currently collapsed. */
    public IsCollapsed(): boolean { return this.section.classList.contains('is-collapsed'); }
    
    /** Sets the collapsed state of the panel. */
    public SetCollapsed(collapsed: boolean): void {
        this.section.classList.toggle('is-collapsed', collapsed);
        this.header.setAttribute('aria-expanded', String(!collapsed));
    }

    /** Adds a new section to the panel body. Auto-hides if no content is appended synchronously. */
    public AddSection(label?: string): HTMLElement {
        const section = document.createElement('section');
        section.className = 'panel-section';
        if (label) {
            const title = document.createElement('h3');
            title.textContent = label;
            section.appendChild(title);
        }
        this.body.appendChild(section);
        queueMicrotask(() => {
            const hasContent = label ? section.children.length > 1 : section.children.length > 0;
            if (!hasContent) { section.style.display = 'none'; }
        });
        return section;
    }

    public OnDestroy(): void {
        this.section.remove();
    }
}
