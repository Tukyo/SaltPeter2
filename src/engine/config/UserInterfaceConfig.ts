/** User interface defaults and settings. */
export class UserInterfaceConfig {
    private static readonly config = {
        defaults: {
            brush: {
                collapsed: false,
                style: {
                    top: '248px',
                    right: '14px',
                    width: '240px',
                },
            },
            debug: {
                collapsed: true,
                style: {
                    top: '14px',
                    right: '14px',
                    width: '240px',
                },
            },
            hierarchy: {
                collapsed: false,
                style: {
                    top: '14px',
                    left: '305px',
                    width: '200px',
                    height: '650px',
                },
            },
            inspector: {
                collapsed: false,
                style: {
                    top: '14px',
                    left: '14px',
                    width: '280px',
                    height: '850px',
                },
            },
            materials: {
                collapsed: false,
                style: {
                    top: '630px',
                    right: '14px',
                    width: '240px',
                    height: '465px',
                },
            },
            rendering: {
                collapsed: true,
                style: {
                    top: '57px',
                    right: '14px',
                    width: '240px',
                },
            },
            resources: {
                collapsed: false,
                style: {
                    top: '875px',
                    left: '14px',
                    width: '490px',
                    height: '240px',
                },
            },
            resourcePreview: {
                collapsed: false,
                style: {
                    top: '675px',
                    left: '305px',
                    width: '200px',
                    height: '190px',
                },
            },
            scene: {
                collapsed: false,
                style: {
                    top: '1105px',
                    right: '14px',
                    width: '240px',
                },
            },
            simulation: {
                collapsed: false,
                style: {
                    top: '100px',
                    right: '14px',
                    width: '240px',
                },
            },
        }
    };

    /** Returns the ui configuration. */
    public static GetConfig() {
        return UserInterfaceConfig.config;
    }
}
