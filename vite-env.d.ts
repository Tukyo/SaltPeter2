/// <reference types="vite/client" />

interface Window {
    api: {
        saves: {
            write: (path: string, data: ArrayBuffer, compress?: boolean) => Promise<void>;
            read: (path: string, compress?: boolean) => Promise<ArrayBuffer | null>;
            exists: (path: string) => Promise<boolean>;
            delete: (path: string) => Promise<void>;
            deleteDir: (path: string) => Promise<void>;
        };
        resources: {
            list: () => Promise<string[]>;
            read: (path: string) => Promise<string>;
            write: (filename: string, content: string) => Promise<void>;
            move: (from: string, to: string) => Promise<void>;
            mkdir: (path: string) => Promise<void>;
            delete: (path: string) => Promise<void>;
        };
    };
}
