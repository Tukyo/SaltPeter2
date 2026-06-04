import { KeybindConfig } from '../config/KeybindConfig';
import { NitrateProcess } from '../NitrateProcess';

/**
 * Creates the full-screen UI layer that all panels float within.
 * Add to a scene to activate the UI layer for that scene.
 *
 * ```ts
 * new Nitrate.UserInterfaceManager();
 * ```
 */
export class UserInterfaceManager extends NitrateProcess {
    public static Instance: UserInterfaceManager | null = null;

    /** Full-screen positioning canvas. All panels mount here as absolute children. */
    public readonly panelContent: HTMLElement;

    private readonly keyHandler = (e: KeyboardEvent) => {
        if (e.key === KeybindConfig.GetConfig().editor.toggle && !e.altKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            this.panelContent.classList.toggle('ui-hidden');
        }
    };

    constructor() {
        super();
        UserInterfaceManager.Instance = this;

        this.panelContent = document.createElement('div');
        this.panelContent.id = 'ui-layer';
        document.body.appendChild(this.panelContent);

        document.addEventListener('keydown', this.keyHandler);
    }

    public OnDestroy(): void {
        document.removeEventListener('keydown', this.keyHandler);
        this.panelContent.remove();

        if (UserInterfaceManager.Instance === this) {
            UserInterfaceManager.Instance = null;
        }
    }
}
