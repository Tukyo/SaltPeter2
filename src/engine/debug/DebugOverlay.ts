import { BlueprintOverlay } from './BlueprintOverlay';
import { ChunkOverlay } from './ChunkOverlay';
import { DebugOverlayBadge } from './DebugOverlayBadge';
import { KeybindConfig } from '../config/KeybindConfig';
import { LogManager } from './LogManager';
import { Input } from '../input/Input';
import { NitrateProcess } from '../NitrateProcess';
import { GameObjectOverlay } from './GameObjectOverlay';
import { PressureOverlay } from './PressureOverlay';
import { TemperatureOverlay } from './TemperatureOverlay';

type DebugLayer = 'chunk' | 'stamp' | 'pressure' | 'temperature' | 'gameObject';

const DEBUG_LAYER_LABELS: Record<DebugLayer, string> = {
    chunk: 'Chunks',
    stamp: 'Stamps',
    pressure: 'Pressure',
    temperature: 'Temperature',
    gameObject: 'GameObjects',
};

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
    private readonly stamp = new BlueprintOverlay();
    private readonly gameObject = new GameObjectOverlay();
    private readonly pressure = new PressureOverlay();
    private readonly temperature = new TemperatureOverlay();
    private readonly badge = new DebugOverlayBadge();
    private readonly unsubKeys: Array<() => void> = [];

    private activeLayer: DebugLayer | null = null;

    constructor() {
        super();
        this.Register();
        
        DebugOverlay.Instance = this;

        const input = Input.Instance;
        if (input) {
            const keys = KeybindConfig.GetConfig().debug.overlay;
            this.unsubKeys.push(
                input.OnKeyDown(keys.world.chunk, () => { this.SetLayer('chunk'); }),
                input.OnKeyDown(keys.world.stamp, () => { this.SetLayer('stamp'); }),
                input.OnKeyDown(keys.pressure, () => { this.SetLayer('pressure'); }),
                input.OnKeyDown(keys.temperature, () => { this.SetLayer('temperature'); }),
                input.OnKeyDown(keys.gameObject, () => { this.SetLayer('gameObject'); }),
            );
        }

        LogManager.Instance?.Log({
            text: 'DebugOverlay ready.',
            options: { tags: ['DebugOverlay', 'NitrateProcessInit'] }
        });
    }

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
        this.badge.SetLabel(DEBUG_LAYER_LABELS[layer]);
        this.badge.Show();
    }

    private GetOverlay(layer: DebugLayer): ChunkOverlay | BlueprintOverlay | GameObjectOverlay | PressureOverlay | TemperatureOverlay {
        if (layer === 'chunk') { return this.chunk; }
        if (layer === 'stamp') { return this.stamp; }
        if (layer === 'gameObject') { return this.gameObject; }
        if (layer === 'pressure') { return this.pressure; }
        return this.temperature;
    }

    public Update(): void {
        if (!this.activeLayer) { return; }
        this.GetOverlay(this.activeLayer).Update();
    }

    public OnResize(): void {
        this.chunk.OnResize();
        this.stamp.OnResize();
        this.gameObject.OnResize();
        this.pressure.OnResize();
        this.temperature.OnResize();
        LogManager.Instance?.Log({
            text: 'DebugOverlay OnResize.',
            options: { tags: ['DebugOverlay'] }
        });
    }

    public OnDestroy(): void {
        for (const unsub of this.unsubKeys) { unsub(); }

        this.chunk.Destroy();
        this.stamp.Destroy();
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
