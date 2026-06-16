import { contextBridge, ipcRenderer } from 'electron';

const isDev = !!process.env['ELECTRON_RENDERER_URL'];
const assetsChannel = isDev ? 'resources' : 'userdata';

contextBridge.exposeInMainWorld('api', {
    saves: {
        write: (path: string, data: ArrayBuffer, compress = true): Promise<void> =>
            ipcRenderer.invoke('saves:write', path, data, compress),
        read: (path: string, compress = true): Promise<ArrayBuffer | null> =>
            ipcRenderer.invoke('saves:read', path, compress),
        exists: (path: string): Promise<boolean> =>
            ipcRenderer.invoke('saves:exists', path),
        delete: (path: string): Promise<void> =>
            ipcRenderer.invoke('saves:delete', path),
        deleteDir: (path: string): Promise<void> =>
            ipcRenderer.invoke('saves:deleteDir', path),
    },
    resources: {
        list: (): Promise<string[]> =>
            ipcRenderer.invoke('resources:list'),
        read: (path: string): Promise<string> =>
            ipcRenderer.invoke('resources:read', path),
        write: (filename: string, content: string): Promise<void> =>
            ipcRenderer.invoke('resources:write', filename, content),
        writeBinary: (filename: string, data: Uint8Array): Promise<void> =>
            ipcRenderer.invoke('resources:writeBinary', filename, data),
        move: (from: string, to: string): Promise<void> =>
            ipcRenderer.invoke('resources:move', from, to),
        mkdir: (path: string): Promise<void> =>
            ipcRenderer.invoke('resources:mkdir', path),
        delete: (path: string): Promise<void> =>
            ipcRenderer.invoke('resources:delete', path),
    },
    userdata: {
        label: (): Promise<string> =>
            ipcRenderer.invoke('userdata:label'),
        list: (): Promise<string[]> =>
            ipcRenderer.invoke('userdata:list'),
        read: (path: string): Promise<string> =>
            ipcRenderer.invoke('userdata:read', path),
        write: (filename: string, content: string): Promise<void> =>
            ipcRenderer.invoke('userdata:write', filename, content),
        writeBinary: (filename: string, data: Uint8Array): Promise<void> =>
            ipcRenderer.invoke('userdata:writeBinary', filename, data),
        move: (from: string, to: string): Promise<void> =>
            ipcRenderer.invoke('userdata:move', from, to),
        mkdir: (path: string): Promise<void> =>
            ipcRenderer.invoke('userdata:mkdir', path),
        delete: (path: string): Promise<void> =>
            ipcRenderer.invoke('userdata:delete', path),
    },
    assets: {
        list: (): Promise<string[]> =>
            ipcRenderer.invoke(`${assetsChannel}:list`),
        read: (path: string): Promise<string> =>
            ipcRenderer.invoke(`${assetsChannel}:read`, path),
        write: (filename: string, content: string): Promise<void> =>
            ipcRenderer.invoke(`${assetsChannel}:write`, filename, content),
        writeBinary: (filename: string, data: Uint8Array): Promise<void> =>
            ipcRenderer.invoke(`${assetsChannel}:writeBinary`, filename, data),
        move: (from: string, to: string): Promise<void> =>
            ipcRenderer.invoke(`${assetsChannel}:move`, from, to),
        mkdir: (path: string): Promise<void> =>
            ipcRenderer.invoke(`${assetsChannel}:mkdir`, path),
        delete: (path: string): Promise<void> =>
            ipcRenderer.invoke(`${assetsChannel}:delete`, path),
    },
    screenshot: {
        capture: (rect: { x: number; y: number; width: number; height: number }, filename: string): Promise<void> =>
            ipcRenderer.invoke('screenshot:capture', rect, filename),
    },
    shell: {
        showAsset: (relativePath: string): Promise<void> =>
            ipcRenderer.invoke('shell:showItemInFolder', assetsChannel, relativePath),
        showScreenshot: (relativePath: string): Promise<void> =>
            ipcRenderer.invoke('shell:showItemInFolder', 'screenshots', relativePath),
    },
});
