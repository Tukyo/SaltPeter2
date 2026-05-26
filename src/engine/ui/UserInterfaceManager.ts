import { KeybindConfig } from '../config/KeybindConfig';
import { NitrateProcess } from '../NitrateProcess';

/**
 * Creates and owns UI docket elements that panels mount into.
 * Add to a scene to activate the UI layer for that scene.
 * 
 * ```ts
 * new Nitrate.UserInterfaceManager();
 * ```
 */
export class UserInterfaceManager extends NitrateProcess {
    public static Instance: UserInterfaceManager | null = null;

    public readonly toolsDocket: HTMLElement;
    public readonly inspectorDocket: HTMLElement;
    public readonly hierarchyDocket: HTMLElement;
    public readonly resourcesDocket: HTMLElement;

    private readonly keyHandler = (e: KeyboardEvent) => {
        if (e.key === KeybindConfig.GetConfig().editor.toggle && !e.altKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            document.body.classList.toggle('ui-hidden');
        }
    };

    constructor() {
        super();
        UserInterfaceManager.Instance = this;

        this.toolsDocket = document.createElement('div');
        this.toolsDocket.id = 'tools-docket';
        document.body.appendChild(this.toolsDocket);

        this.inspectorDocket = document.createElement('div');
        this.inspectorDocket.id = 'inspector-docket';
        document.body.appendChild(this.inspectorDocket);

        this.hierarchyDocket = document.createElement('div');
        this.hierarchyDocket.id = 'hierarchy-docket';
        document.body.appendChild(this.hierarchyDocket);

        this.resourcesDocket = document.createElement('div');
        this.resourcesDocket.id = 'resources-docket';
        document.body.appendChild(this.resourcesDocket);

        document.addEventListener('keydown', this.keyHandler);
    }

    public OnDestroy(): void {
        document.removeEventListener('keydown', this.keyHandler);
        document.body.classList.remove('ui-hidden');

        this.toolsDocket.remove();
        this.inspectorDocket.remove();
        this.hierarchyDocket.remove();
        this.resourcesDocket.remove();

        if (UserInterfaceManager.Instance === this) {
            UserInterfaceManager.Instance = null;
        }
    }
}
