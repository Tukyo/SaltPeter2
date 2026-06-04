import { Input } from '../input/Input';
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

    private readonly unsubToggle: (() => void) | undefined;

    constructor() {
        super();
        UserInterfaceManager.Instance = this;

        this.panelContent = document.createElement('div');
        this.panelContent.id = 'ui-layer';
        document.body.appendChild(this.panelContent);

        this.unsubToggle = Input.Instance?.OnKeyDown(KeybindConfig.GetConfig().editor.toggle, () => {
            if (Input.Instance?.IsKeyDown('Alt') || Input.Instance?.IsKeyDown('Control') ||
                Input.Instance?.IsKeyDown('Meta')) { return; }
            this.panelContent.classList.toggle('ui-hidden');
        });
    }

    public OnDestroy(): void {
        this.unsubToggle?.();
        this.panelContent.remove();

        if (UserInterfaceManager.Instance === this) {
            UserInterfaceManager.Instance = null;
        }
    }
}
