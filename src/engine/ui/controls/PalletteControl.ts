import type { PaletteSetting } from '../UserInterfaceTypes';
import type { ControlHandler } from '../UserInterfaceRegistry';
import { UserInterfaceRegistry } from '../UserInterfaceRegistry';

/** Control handler for `PaletteSetting`. Renders a row of color swatches with single selection. */
export class PaletteControl implements ControlHandler<PaletteSetting> {
    public static readonly Instance = new PaletteControl();
    private constructor() { UserInterfaceRegistry.Register('palette', this); }

    private Sync(group: HTMLDivElement, setting: PaletteSetting): void {
        const current = Math.round(Number(group.dataset.value ?? setting.default));
        group.querySelectorAll('.palette-swatch').forEach((swatch, i) => {
            (swatch as HTMLElement).classList.toggle('is-selected', i === current);
        });
    }

    // @omitfromdocs
    public Build(_key: string, setting: PaletteSetting) {
        const wrapper = document.createElement('div');
        wrapper.className = 'control-item';

        const group = document.createElement('div');
        group.id = setting.id;
        group.className = 'palette-picker';
        group.dataset.value = String(setting.default);

        for (let i = 0; i < setting.count; i++) {
            const swatch = document.createElement('button');
            swatch.type = 'button';
            swatch.className = 'palette-swatch';
            swatch.dataset.variant = String(i);
            group.appendChild(swatch);
        }

        this.Sync(group, setting);
        wrapper.appendChild(group);
        return { wrapper, element: group, sync: () => { this.Sync(group, setting); }, isValue: true };
    }

    // @omitfromdocs
    public Bind(_key: string, element: HTMLDivElement, _entry: unknown, fireChange: () => void, _onAction: unknown) {
        element.querySelectorAll<HTMLElement>('.palette-swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                const selected = Math.round(Number(swatch.dataset.variant ?? '0'));
                element.dataset.value = String(selected);
                element.querySelectorAll<HTMLElement>('.palette-swatch').forEach((s, i) => {
                    s.classList.toggle('is-selected', i === selected);
                });
                fireChange();
            });
        });
    }

    // @omitfromdocs
    public GetRawValue(element: HTMLDivElement, setting: PaletteSetting): number {
        const raw = Number(element.dataset.value ?? setting.default);
        return Math.max(0, Math.min(setting.count - 1, Math.round(raw)));
    }
}
