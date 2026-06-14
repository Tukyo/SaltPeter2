/** Keyboard shortcuts used across engine features. */
export class KeybindConfig {
    private static readonly config = {
        debug: {
            overlay: {
                pressure: 'F2',
                temperature: 'F3',
                gameObject: 'F4',
                layer: {
                    down: "[",
                    up: "]"
                },
                world: {
                    chunk: 'F5',
                    stamp: 'F6'
                }
            },
            analytics: '`',
        },
        editor: {
            toggle: 'Tab',
            playerScale: 'p'
        },
        screenshot: {
            capture: '~',
        },
    };

    /** Returns the keybind configuration. */
    public static GetConfig() { return KeybindConfig.config; }
}
