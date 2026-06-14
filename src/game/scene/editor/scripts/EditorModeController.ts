import { Nitrate } from '@Nitrate';

export type EditorMode = 'gameobject' | 'blueprint';

const modeSetting: Nitrate.ChoiceSetting = {
    id: 'editor-mode',
    type: 'choice',
    default: 'gameobject',
    options: [
        { value: 'gameobject', label: 'Game Object' },
        { value: 'blueprint', label: 'Blueprint' },
    ],
};

export class EditorModeController extends Nitrate.NitrateProcess {
    private readonly panel: Nitrate.CollapsiblePanel;
    private readonly modeEl: HTMLDivElement;

    constructor(onChange: (mode: EditorMode) => void) {
        super();

        this.panel = new Nitrate.CollapsiblePanel({
            label: 'Editor',
            parent: Nitrate.UserInterfaceManager.Instance?.panelContent,
            collapsed: true,
            style: { top: '14px', right: '14px', width: '240px' }
        });

        const section = this.panel.AddSection();
        const { wrapper, element } = Nitrate.ChoiceControl.Instance.Build('editor-mode', modeSetting);
        this.modeEl = element as HTMLDivElement;

        Nitrate.ChoiceControl.Instance.Bind('editor-mode', this.modeEl, null, () => {
            onChange(this.modeEl.dataset.value as EditorMode);
        }, null);

        section.appendChild(wrapper);
    }

    public SetMode(mode: EditorMode): void {
        this.modeEl.dataset.value = mode;
        this.modeEl.querySelectorAll<HTMLElement>('button').forEach(btn => {
            const selected = btn.dataset.value === mode;
            btn.classList.toggle('is-selected', selected);
            btn.setAttribute('aria-checked', String(selected));
        });
    }

    public OnDestroy(): void { }
}
