import { Analytics } from './Analytics';
import { AnalyticsMenu } from './AnalyticsMenu';
import { Input } from '../input/Input';
import { KeybindConfig } from '../config/KeybindConfig';
import { NitrateProcess } from '../NitrateProcess';
import { Renderer } from '../rendering/Renderer';
import { SimulationManager } from '../simulation/SimulationManager';

/**
 * Live material cell-count overlay for the active scene.
 * 
 * Toggle visibility with the keybind set in {@link KeybindConfig}.
 * 
 * ```ts
 * new Nitrate.AnalyticsOverlay();
 * ```
 */
export class AnalyticsOverlay extends NitrateProcess {
    private menu: AnalyticsMenu | null = null;
    private readPending: boolean = false;

    private readonly unsubKey: (() => void) | undefined;

    constructor() {
        super();
        this.unsubKey = Input.Instance?.OnKeyDown(KeybindConfig.GetConfig().debug.analytics, () => {
            if (this.menu) {
                this.menu.Destroy();
                this.menu = null;
            } else {
                this.menu = new AnalyticsMenu();
            }
        });
    }

    public Update(): void {
        if (!this.menu) { return; }

        const sim = SimulationManager.Instance;
        const device = Renderer.Instance?.GetWebGPU()?.device;
        const simulationLayer = sim?.simulationLayer;
        if (!sim || !device || !simulationLayer || sim.state.GetLastTickSimulationSteps() <= 0) { return; }

        const enc = device.createCommandEncoder();
        Analytics.Run(enc, simulationLayer.currentIdentity, { width: simulationLayer.width, height: simulationLayer.height });
        device.queue.submit([enc.finish()]);
        this.PollRead();
    }

    private PollRead(): void {
        if (this.readPending) { return; }
        this.readPending = true;
        void Analytics.ReadAsync().then(counts => {
            this.menu?.Update(counts);
        }).finally(() => {
            this.readPending = false;
        });
    }

    public OnDestroy(): void {
        this.unsubKey?.();
        this.menu?.Destroy();
        this.menu = null;
    }
}
