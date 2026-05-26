import { Analytics } from './Analytics';
import { AnalyticsMenu } from './AnalyticsMenu';
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

    private readonly handleKey: (e: KeyboardEvent) => void;

    constructor() {
        super();
        this.handleKey = (e) => {
            if (e.key !== KeybindConfig.GetConfig().debug.analytics) { return; }
            if (this.menu) {
                this.menu.Destroy();
                this.menu = null;
            } else {
                this.menu = new AnalyticsMenu();
            }
        };
        window.addEventListener('keydown', this.handleKey);
    }

    public Update(): void {
        if (!this.menu) { return; }

        const sim = SimulationManager.Instance;
        const device = Renderer.Instance?.GetWebGPU()?.device;
        const pingPong = sim?.pingPong;
        if (!sim || !device || !pingPong || sim.state.GetLastTickSimulationSteps() <= 0) { return; }

        const enc = device.createCommandEncoder();
        Analytics.Run(enc, pingPong.currentIdentity, { width: pingPong.width, height: pingPong.height });
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
        window.removeEventListener('keydown', this.handleKey);
        this.menu?.Destroy();
        this.menu = null;
    }
}
