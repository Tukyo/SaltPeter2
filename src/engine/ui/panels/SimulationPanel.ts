import type { ActionGroupSetting, RangeSetting } from '../UserInterfaceTypes';

import { ActionGroupControl } from '../controls/ActionGroupControl';
import { CollapsiblePanel } from '../CollapsiblePanel';
import { NitrateProcess } from '../../NitrateProcess';
import { RangeControl } from '../controls/RangeControl';
import { SimulationManager } from '../../simulation/SimulationManager';
import { UserInterfaceManager } from '../UserInterfaceManager';

/**
 * Simulation controls panel. Provides play/pause buttons and a simulation speed slider.
 * 
 * ```ts
 * new Nitrate.SimulationPanel();
 * ```
 */
export class SimulationPanel extends NitrateProcess {
    private readonly panel: CollapsiblePanel;
    private readonly playButton: HTMLButtonElement;
    private readonly pauseButton: HTMLButtonElement;
    private readonly speedElement: HTMLInputElement;

    private static readonly controlsSetting: ActionGroupSetting = {
        id: 'sim-controls',
        type: 'actionGroup',
        options: [
            { value: 'play', label: 'Play', icon: 'play' },
            { value: 'pause', label: 'Pause', icon: 'pause' },
        ],
    };

    private static readonly speedSetting: RangeSetting = {
        id: 'sim-speed',
        label: 'Simulation Speed',
        type: 'range',
        min: 0.25,
        max: 4,
        step: 0.25,
        default: 1.0,
        suffix: 'x',
        decimals: 2,
        readout: true,
    };

    constructor() {
        super();

        this.panel = new CollapsiblePanel({
            label: 'Simulation',
            parent: UserInterfaceManager.Instance?.toolsDocket as HTMLElement
        });

        const section = this.panel.AddSection();

        const { wrapper: controlsWrapper, element: controlsEl } = ActionGroupControl.Instance.Build(
            'sim-controls',
            SimulationPanel.controlsSetting
        );
        this.playButton = controlsEl.querySelector<HTMLButtonElement>('[data-action="play"]')!;
        this.pauseButton = controlsEl.querySelector<HTMLButtonElement>('[data-action="pause"]')!;
        this.playButton.addEventListener('click', () => { this.SetPaused(false); SimulationManager.Instance?.state.SetPaused(false); });
        this.pauseButton.addEventListener('click', () => { this.SetPaused(true); SimulationManager.Instance?.state.SetPaused(true); });
        section.appendChild(controlsWrapper);

        const { wrapper: speedWrapper, element: speedEl, sync: speedSync } = RangeControl.Instance.Build(
            'sim-speed',
            SimulationPanel.speedSetting
        );
        this.speedElement = speedEl as HTMLInputElement;
        section.appendChild(speedWrapper);

        RangeControl.Instance.Bind('sim-speed', this.speedElement, { sync: speedSync }, () => {
            speedSync?.();
            SimulationManager.Instance?.state.SetSimSpeed(this.GetSimSpeed());
        }, null);

        this.SetPaused(false);
    }

    /** Sets the active state of the play and pause buttons to reflect the current paused state. */
    public SetPaused(paused: boolean): void {
        this.playButton.classList.toggle('is-active', !paused);
        this.pauseButton.classList.toggle('is-active', paused);
    }

    /** Returns the current simulation speed multiplier from the speed slider. */
    public GetSimSpeed(): number {
        return RangeControl.Instance.GetRawValue(this.speedElement, SimulationPanel.speedSetting);
    }

    public OnDestroy(): void {
        this.panel.OnDestroy();
    }
}
