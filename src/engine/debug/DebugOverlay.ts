import { ChunkOverlay } from './ChunkOverlay';
import { KeybindConfig } from '../config/KeybindConfig';
import { LogManager } from './LogManager';
import { NitrateProcess } from '../NitrateProcess';
import { GameObjectOverlay } from './GameObjectOverlay';
import { PressureOverlay } from './PressureOverlay';
import { TemperatureOverlay } from './TemperatureOverlay';

type DebugLayer = 'chunk' | 'pressure' | 'temperature' | 'gameObject';

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
    private readonly handleKey: (e: KeyboardEvent) => void;

    private activeLayer: DebugLayer | null = null;

    constructor() {
        super();
        DebugOverlay.Instance = this;

        this.handleKey = (e) => {
            const { chunk, pressure, temperature, gameObject } = KeybindConfig.GetConfig().debug.overlay;
            if (e.key === chunk) { this.SetLayer('chunk'); }
            else if (e.key === pressure) { this.SetLayer('pressure'); }
            else if (e.key === temperature) { this.SetLayer('temperature'); }
            else if (e.key === gameObject) { this.SetLayer('gameObject'); }
        };

        window.addEventListener('keydown', this.handleKey);

        LogManager.Instance?.Log({
            text: `DebugOverlay ready.`,
            options: { tags: ['DebugOverlay', 'NitrateProcessInit'] }
        });
    }

    /** Activates the given layer, hiding the previously active one. Toggles off if the same layer is selected twice. */
    private SetLayer(layer: DebugLayer): void {
        if (this.activeLayer === layer) {
            this.GetOverlay(layer).Hide();
            this.activeLayer = null;
            return;
        }
        if (this.activeLayer) { this.GetOverlay(this.activeLayer).Hide(); }
        this.GetOverlay(layer).Show();
        this.activeLayer = layer;
    }

    /** Returns the overlay instance for the given layer. */
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
        this.chunk.OnDestroy();
        this.gameObject.OnDestroy();
        this.pressure.OnDestroy();
        this.temperature.OnDestroy();

        if (DebugOverlay.Instance === this) {
            DebugOverlay.Instance = null;
            LogManager.Instance?.Log({
                text: 'Cleared DebugOverlay singleton instance.',
                options: { tags: ['DebugOverlay', 'NitrateProcessDestroy'] }
            });
        }
    }
}
