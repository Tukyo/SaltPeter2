import { LogManager } from "../debug/LogManager";

export interface ModalOptions {
    title: string;
    confirmLabel?: string;
    cancelLabel?: string;
}

/**
 * Utility class for displaying modal overlays.
 * 
 * ```ts
 * const confirmed = await Modal.Confirm({ title, confirmLabel: 'Confirm', cancelLabel: 'Cancel' });
 * if (!confirmed) { return; }
 * ```
 */
export class Modal {
    /** Mounts arbitrary content in a centered modal overlay. Returns a handle to close it programmatically. */
    public static Show(content: HTMLElement): { close: () => void } {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const container = document.createElement('div');
        container.className = 'modal-container modal-container--centered';

        container.appendChild(content);
        overlay.appendChild(container);
        document.body.appendChild(overlay);

        LogManager.Instance?.Log({
            text: 'Modal shown.',
            options: { tags: ["UserInterface"] }
        });

        return {
            close: () => {
                overlay.remove();
                LogManager.Instance?.Log({
                    text: 'Modal closed.',
                    options: { tags: ["UserInterface"] }
                });
            }
        };
    }

    /** Shows a confirm/cancel modal with a title. Resolves true if confirmed, false if cancelled or dismissed. */
    public static Confirm(options: ModalOptions): Promise<boolean> {
        const { title, confirmLabel = 'Confirm', cancelLabel = 'Cancel' } = options;

        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';

            const container = document.createElement('div');
            container.className = 'modal-container';

            const header = document.createElement('div');
            header.className = 'modal-header';
            const titleEl = document.createElement('h2');
            titleEl.className = 'modal-title';
            titleEl.textContent = title;
            header.appendChild(titleEl);

            const body = document.createElement('div');
            body.className = 'modal-body';

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'modal-btn';
            cancelBtn.textContent = cancelLabel;

            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'modal-btn modal-btn--danger';
            confirmBtn.textContent = confirmLabel;

            body.appendChild(cancelBtn);
            body.appendChild(confirmBtn);

            container.appendChild(header);
            container.appendChild(body);
            overlay.appendChild(container);
            document.body.appendChild(overlay);

            LogManager.Instance?.Log({
                text: 'Modal shown.',
                options: { tags: ["UserInterface"], data: { title } }
            });

            const cleanup = (result: boolean) => {
                overlay.remove();
                LogManager.Instance?.Log({
                    text: 'Modal dismissed.',
                    options: { tags: ["UserInterface"], data: { confirmed: result } }
                });
                resolve(result);
            };

            cancelBtn.addEventListener('click', () => cleanup(false));
            confirmBtn.addEventListener('click', () => cleanup(true));
            overlay.addEventListener('click', e => { if (e.target === overlay) { cleanup(false); } });
        });
    }
}
