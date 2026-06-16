import { NitrateProcess } from "../NitrateProcess";

type LogLevel =
    | "Log"
    | "Warn"
    | "Error"

type LogTag =
    | "Camera"
    | "Input"
    | "NitrateEngine"
    | "NitrateProcessInit"
    | "NitrateProcessDestroy"
    | "NitrateProcessBeforeDestroy"
    | "NitrateProcessBeforeResize"
    | "Mouse"
    | "Brush"
    | "World"
    | "DebugOverlay"
    | "Chunk"
    | "Sim"
    | "Window"
    | "Resources"
    | "DataPersistence"
    | "Hierarchy"
    | "Inspector"
    | "Export"
    | "Import"
    | "Metadata"
    | "GameObject"
    | "PassRegistry"
    | "UserInterface"
    | "Rendering"
    | "Resize"

const TAG_COLORS: Record<LogTag, string> = {
    Camera: '#4fc3f7',
    Input: '#ffffff',
    NitrateEngine: '#00ff0d',
    NitrateProcessInit: '#fff176',
    NitrateProcessDestroy: '#ef9a9a',
    NitrateProcessBeforeDestroy: '#f3d086',
    NitrateProcessBeforeResize: '#c2cc75',
    Mouse: '#ce93d8',
    Brush: '#ffb74d',
    World: '#71f77c',
    DebugOverlay: '#a3a3a3',
    Chunk: '#ce6395',
    Sim: '#b62020',
    Window: '#000000',
    Resources: '#6d488e',
    DataPersistence: '#6a781e',
    Hierarchy: '#0db3a7',
    Inspector: '#8a9f3e',
    Export: '#e573ed',
    Import: '#1f6cb4',
    Metadata: '#b26f0a',
    GameObject: '#b4017e',
    PassRegistry: '#ff0000',
    UserInterface: '#0c8b45',
    Rendering: '#5640b6',
    Resize: '#8e309b'
};

export interface LogManagerOptions {
    quiet?: boolean;
    showTimestamps?: boolean;
    filterMode?: 'allowlist' | 'blocklist'
    filters?: LogTag[];
}

export interface LogParams {
    text: string;
    options?: {
        noisy?: boolean;
        tags?: LogTag[];
        data?: unknown;
    }
}

/**
 * Singleton logger that routes all engine console output through a tag-based
 * filter and colour formatter before forwarding to the browser console.
 * 
 * ```ts
 * new Nitrate.LogManager({ quiet: true, filterMode: 'allowlist', filters: ['Sim'] });
 * ```
 */
export class LogManager extends NitrateProcess {
    public static Instance: LogManager | null = null;

    private readonly hideNoisyLogs: boolean;
    private readonly showTimestamps: boolean;
    private readonly suppressedTags: Set<LogTag>;
    private readonly filterMode: 'allowlist' | 'blocklist';

    constructor(options?: LogManagerOptions) {
        super();
        this.hideNoisyLogs = options?.quiet ?? false;
        this.showTimestamps = options?.showTimestamps ?? false;
        this.suppressedTags = new Set(options?.filters ?? []);
        this.filterMode = options?.filterMode ?? 'blocklist';
        LogManager.Instance = this;
    }

    /** Emits a standard log entry. */
    public Log(params: LogParams): void { this.Write('Log', params); }
    /** Emits a warning log entry. */
    public LogWarning(params: LogParams): void { this.Write('Warn', params); }
    /** Emits an error log entry. */
    public LogError(params: LogParams): void { this.Write('Error', params); }

    /** Applies tag filtering, formats the message with colour-coded tag badges, and forwards to the appropriate console method. */
    private Write(level: LogLevel, params: LogParams): void {
        const noisy = params.options?.noisy ?? false;
        const timestamp = this.showTimestamps;
        const tags = params.options?.tags ?? [];
        const data = params.options?.data;

        if (noisy && this.hideNoisyLogs) { return; }

        const hasMatch = tags.some(t => this.suppressedTags.has(t));
        const isAllowlist = this.filterMode === 'allowlist';
        if (isAllowlist !== hasMatch) { return; }

        const formatParts: string[] = [];
        const styleArgs: string[] = [];

        if (timestamp) { formatParts.push(`[${new Date().toLocaleTimeString()}]`); }

        for (const tag of tags) {
            formatParts.push(`%c[${tag}]%c`);
            styleArgs.push(`color: ${TAG_COLORS[tag]}; font-weight: bold`, '');
        }

        formatParts.push(params.text);

        const format = formatParts.join(' ');
        const args = data !== undefined ? [...styleArgs, data] : styleArgs;

        switch (level) {
            case 'Warn': console.warn(format, ...args); break;
            case 'Error': console.error(format, ...args); break;
            default: console.log(format, ...args); break;
        }
    }

    public OnDestroy(): void {
        if (LogManager.Instance === this) { LogManager.Instance = null; }
    }
}
