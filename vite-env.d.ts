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
            writeBinary: (filename: string, data: Uint8Array) => Promise<void>;
            move: (from: string, to: string) => Promise<void>;
            mkdir: (path: string) => Promise<void>;
            delete: (path: string) => Promise<void>;
        };
        userdata: {
            label: () => Promise<string>;
            list: () => Promise<string[]>;
            read: (path: string) => Promise<string>;
            write: (filename: string, content: string) => Promise<void>;
            writeBinary: (filename: string, data: Uint8Array) => Promise<void>;
            move: (from: string, to: string) => Promise<void>;
            mkdir: (path: string) => Promise<void>;
            delete: (path: string) => Promise<void>;
        };
        assets: {
            list: () => Promise<string[]>;
            read: (path: string) => Promise<string>;
            write: (filename: string, content: string) => Promise<void>;
            writeBinary: (filename: string, data: Uint8Array) => Promise<void>;
            move: (from: string, to: string) => Promise<void>;
            mkdir: (path: string) => Promise<void>;
            delete: (path: string) => Promise<void>;
        };
        screenshot: {
            capture: (rect: { x: number; y: number; width: number; height: number }, filename: string) => Promise<void>;
        };
        shell: {
            showAsset: (relativePath: string) => Promise<void>;
            showScreenshot: (relativePath: string) => Promise<void>;
        };
    };
}
