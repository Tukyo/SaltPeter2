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

    private readonly leftDocket: HTMLElement;
    private readonly rightDocket: HTMLElement;

    private readonly keyHandler = (e: KeyboardEvent) => {
        if (e.key === KeybindConfig.GetConfig().editor.toggle && !e.altKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            const hidden = !this.leftDocket.classList.contains('ui-hidden');
            this.leftDocket.classList.toggle('ui-hidden', hidden);
            this.rightDocket.classList.toggle('ui-hidden', hidden);
        }
    };

    constructor() {
        super();
        UserInterfaceManager.Instance = this;

        this.leftDocket = document.createElement('div');
        this.leftDocket.id = 'left-docket';
        const leftToggle = document.createElement('button');
        leftToggle.className = 'docket-toggle';
        leftToggle.addEventListener('click', () => this.leftDocket.classList.toggle('ui-hidden'));
        this.leftDocket.appendChild(leftToggle);
        const leftContent = document.createElement('div');
        leftContent.className = 'docket-content';
        this.leftDocket.appendChild(leftContent);
        document.body.appendChild(this.leftDocket);

        this.inspectorDocket = document.createElement('div');
        this.inspectorDocket.id = 'inspector-docket';
        leftContent.appendChild(this.inspectorDocket);

        this.hierarchyDocket = document.createElement('div');
        this.hierarchyDocket.id = 'hierarchy-docket';
        leftContent.appendChild(this.hierarchyDocket);

        this.resourcesDocket = document.createElement('div');
        this.resourcesDocket.id = 'resources-docket';
        leftContent.appendChild(this.resourcesDocket);

        this.rightDocket = document.createElement('div');
        this.rightDocket.id = 'right-docket';

        this.toolsDocket = document.createElement('div');
        this.toolsDocket.id = 'tools-docket';
        this.rightDocket.appendChild(this.toolsDocket);

        const rightToggle = document.createElement('button');
        rightToggle.className = 'docket-toggle';
        rightToggle.addEventListener('click', () => this.rightDocket.classList.toggle('ui-hidden'));
        this.rightDocket.appendChild(rightToggle);

        document.body.appendChild(this.rightDocket);

        document.addEventListener('keydown', this.keyHandler);
    }

    public OnDestroy(): void {
        document.removeEventListener('keydown', this.keyHandler);

        this.leftDocket.remove();
        this.rightDocket.remove();

        if (UserInterfaceManager.Instance === this) {
            UserInterfaceManager.Instance = null;
        }
    }
}
