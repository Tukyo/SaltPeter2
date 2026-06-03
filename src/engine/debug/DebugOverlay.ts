import { ChunkOverlay } from './ChunkOverlay';
import { DebugOverlayBadge } from './DebugOverlayBadge';
import { KeybindConfig } from '../config/KeybindConfig';
import { LogManager } from './LogManager';
import { NitrateProcess } from '../NitrateProcess';
import { GameObjectOverlay } from './GameObjectOverlay';
import { PressureOverlay } from './PressureOverlay';
import { TemperatureOverlay } from './TemperatureOverlay';

type DebugLayer = 'chunk' | 'pressure' | 'temperature' | 'gameObject';

const DEBUG_SIM_LAYERS = ['Simulation', 'GameObject'] as const;

/**
 * Toggles debug visualisation overlays for the active scene.
 *
 * Each overlay layer is bound to a hotkey defined in {@link KeybindConfig}.
 *
 * ```ts
 * new Nitrate.DebugOverlay();
 * ```
 */
export class DebugOverlay extends NitrateProcess {
    public static Instance: DebugOverlay | null = null;

    private readonly chunk = new ChunkOverlay();
    private readonly gameObject = new GameObjectOverlay();
    private readonly pressure = new PressureOverlay();
    private readonly temperature = new TemperatureOverlay();
    private readonly badge = new DebugOverlayBadge();
    private readonly handleKey: (e: KeyboardEvent) => void;

    private activeLayer: DebugLayer | null = null;
    private activeLayerIndex: number = 0;

    constructor() {
        super();
        DebugOverlay.Instance = this;

        this.badge.SetLabel(DEBUG_SIM_LAYERS[this.activeLayerIndex]);

        this.handleKey = (e) => {
            const keys = KeybindConfig.GetConfig().debug.overlay;
            if (e.key === keys.chunk) { this.SetLayer('chunk'); }
            else if (e.key === keys.pressure) { this.SetLayer('pressure'); }
            else if (e.key === keys.temperature) { this.SetLayer('temperature'); }
            else if (e.key === keys.gameObject) { this.SetLayer('gameObject'); }
            else if (e.key === keys.layer.down) { this.CycleLayer(-1); }
            else if (e.key === keys.layer.up) { this.CycleLayer(1); }
        };

        window.addEventListener('keydown', this.handleKey);

        LogManager.Instance?.Log({
            text: 'DebugOverlay ready.',
            options: { tags: ['DebugOverlay', 'NitrateProcessInit'] }
        });
    }

    /** Cycles the active layer. Keybinds in {@link KeybindConfig}. @internal */
    public CycleLayer(direction: 1 | -1): void {
        const count = DEBUG_SIM_LAYERS.length;
        this.activeLayerIndex = (this.activeLayerIndex + direction + count) % count;
        this.badge.SetLabel(DEBUG_SIM_LAYERS[this.activeLayerIndex]);
        this.temperature.SetLayerIndex(this.activeLayerIndex);
    }

    /** Returns the active layer index. @internal */
    public GetActiveLayerIndex(): number { return this.activeLayerIndex; }

    /** Returns the active layer name. @internal */
    public GetActiveLayerName(): string { return DEBUG_SIM_LAYERS[this.activeLayerIndex]; }

    private SetLayer(layer: DebugLayer): void {
        if (this.activeLayer === layer) {
            this.GetOverlay(layer).Hide();
            this.activeLayer = null;
            this.badge.Hide();
            return;
        }
        if (this.activeLayer) { this.GetOverlay(this.activeLayer).Hide(); }
        this.GetOverlay(layer).Show();
        this.activeLayer = layer;

        if (layer === 'temperature') {
            this.badge.Show();
        } else {
            this.badge.Hide();
        }
    }

    private GetOverlay(layer: DebugLayer): ChunkOverlay | GameObjectOverlay | PressureOverlay | TemperatureOverlay {
        if (layer === 'chunk') { return this.chunk; }
        if (layer === 'gameObject') { return this.gameObject; }
        if (layer === 'pressure') { return this.pressure; }
        return this.temperature;
    }

    public Update(now: number): void {
        if (!this.activeLayer) { return; }
        this.GetOverlay(this.activeLayer).Update();
    }

    public OnResize(): void {
        this.chunk.OnResize();
        this.gameObject.OnResize();
        this.pressure.OnResize();
        this.temperature.OnResize();
        LogManager.Instance?.Log({
            text: 'DebugOverlay OnResize.',
            options: { tags: ['DebugOverlay'] }
        });
    }

    public OnDestroy(): void {
        window.removeEventListener('keydown', this.handleKey);

        this.chunk.Destroy();
        this.gameObject.Destroy();
        this.pressure.Destroy();
        this.temperature.Destroy();
        this.badge.Destroy();

        if (DebugOverlay.Instance === this) {
            DebugOverlay.Instance = null;
            LogManager.Instance?.Log({
                text: 'Cleared DebugOverlay singleton instance.',
                options: { tags: ['DebugOverlay', 'NitrateProcessDestroy'] }
            });
        }
    }
}
