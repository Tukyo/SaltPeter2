/** Keyboard shortcuts used across engine features. */
export class KeybindConfig {
    private static readonly config = {
        debug: {
            overlay: {
                chunk: 'F1',
                pressure: 'F2',
                temperature: 'F3',
            },
            analytics: '`',
        },
        editor: {
            toggle: 'Tab',
        }
    };

    /** Returns the keybind configuration. */
    public static GetConfig() {
        return KeybindConfig.config;
    }
}
