import type { ButtonSetting } from '../UserInterfaceTypes';

import { ButtonControl } from '../controls/ButtonControl';
import { CollapsiblePanel } from '../CollapsiblePanel';
import { Modal } from '../Modal';
import { NitrateEngine } from '../../NitrateEngine';
import { NitrateProcess } from '../../NitrateProcess';
import { Renderer } from '../../rendering/Renderer';
import { SceneManager } from '../../scene/SceneManager';
import { UserInterfaceManager } from '../UserInterfaceManager';

export interface ScenePanelParams {
    export?: { onExport?: () => void; }
    clear?: { onClear?: () => Promise<void> | void; }
}

/**
 * Scene action panel. Provides export, clear, and exit buttons.
 * Clear and exit prompt for confirmation when the scene is dirty.
 * 
 * ```ts
 * new Nitrate.ScenePanel({params?: ScenePanelParams})
 * ```
 */
export class ScenePanel extends NitrateProcess {
    private readonly panel: CollapsiblePanel;

    private static readonly exportSetting: ButtonSetting = {
        id: 'scene-export',
        type: 'button',
        label: 'Export Object',
        action: 'export',
    };

    private static readonly clearSetting: ButtonSetting = {
        id: 'scene-clear',
        type: 'button',
        label: 'Clear Scene',
        action: 'clear',
        variant: 'warn',
    };

    private static readonly exitSetting: ButtonSetting = {
        id: 'scene-exit',
        type: 'button',
        label: 'Exit Scene',
        action: 'exit',
        variant: 'danger',
    };

    constructor(params?: ScenePanelParams) {
        super();

        this.panel = new CollapsiblePanel({
            label: 'Scene',
            parent: UserInterfaceManager.Instance?.toolsDocket as HTMLElement
        });

        const section = this.panel.AddSection();

        if (params?.export) {
            const { wrapper: exportWrapper, element: exportEl } = ButtonControl.Instance.Build('scene-export', ScenePanel.exportSetting);
            (exportEl as HTMLButtonElement).addEventListener('click', () => { params.export?.onExport?.(); });
            section.appendChild(exportWrapper);
        }

        if (params?.clear) {
            const { wrapper: clearWrapper, element: clearEl } = ButtonControl.Instance.Build('scene-clear', ScenePanel.clearSetting);
            (clearEl as HTMLButtonElement).addEventListener('click', () => { void this.HandleClear(params.clear?.onClear); });
            section.appendChild(clearWrapper);
        }

        const { wrapper: exitWrapper, element: exitEl } = ButtonControl.Instance.Build('scene-exit', ScenePanel.exitSetting);
        (exitEl as HTMLButtonElement).addEventListener('click', () => { void this.HandleExit(); });
        section.appendChild(exitWrapper);
    }

    /** Prompts for confirmation if the scene is dirty, clears dirty state, then fires the onClear callback or falls back to a canvas resize. */
    private async HandleClear(onClear: (() => Promise<void> | void) | undefined): Promise<void> {
        if (SceneManager.IsDirty()) {
            const confirmed = await Modal.Confirm({
                title: 'Clear Scene?',
                confirmLabel: 'Clear',
                cancelLabel: 'Cancel',
            });
            if (!confirmed) { return; }
        }
        SceneManager.ClearDirty();
        if (onClear) {
            await onClear();
        } else {
            const canvas = Renderer.Instance?.GetWebGPU()?.canvas;
            if (canvas) { NitrateEngine.Resize({ width: canvas.width, height: canvas.height }); }
        }
    }

    /** Prompts for confirmation if the scene is dirty, then exits to scene select. */
    private async HandleExit(): Promise<void> {
        if (SceneManager.IsDirty()) {
            const confirmed = await Modal.Confirm({
                title: 'Exit Scene?',
                confirmLabel: 'Exit',
                cancelLabel: 'Cancel',
            });
            if (!confirmed) { return; }
        }
        SceneManager.ExitScene();
    }

    public OnDestroy(): void {
        this.panel.OnDestroy();
    }
}
