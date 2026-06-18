import { Input } from "../input/Input";
import { LogManager } from "../debug/LogManager";
import { NitrateProcess } from "../NitrateProcess";

type NotificationLevel =
    | 'info'
    | 'success'
    | 'warn'
    | 'error'

export interface NotificationOptions {
    message: string;
    level?: NotificationLevel;
    title?: string;
    duration: number;
    action?: { label: string; onClick: () => void };
}

/**
 * Manages a toast notification stack anchored at the bottom-center of the screen.
 * Instantiated by UserInterfaceManager. Callers pass `duration: 0` for persistent toasts
 * that require an explicit click to dismiss.
 *
 * ```ts
 * NotificationManager.Instance?.Notify({ message: 'Export complete!', level: 'success', duration: 4000 });
 * NotificationManager.Instance?.Notify({ title: 'Export Failed', message: 'Invalid material in margin.', level: 'error', duration: 0 });
 * ```
 */
export class NotificationManager extends NitrateProcess {
    public static Instance: NotificationManager | null = null;

    private readonly maxNotifications = 5;

    private readonly container: HTMLElement;
    private readonly pendingVisible: HTMLElement[] = [];
    private readonly activeNotifications: HTMLElement[] = [];
    private readonly notificationUnsubscribers: Map<HTMLElement, () => void> = new Map();

    constructor() {
        super();
        this.Register();
        
        NotificationManager.Instance = this;

        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        document.body.appendChild(this.container);
    }

    public Update(): void {
        if (this.pendingVisible.length === 0) { return; }
        for (const notification of this.pendingVisible) { notification.classList.add('notification--visible'); }
        this.pendingVisible.length = 0;
    }

    /** Builds and shows a notification. If the stack is full the oldest notification is immediately evicted to make room. */
    public Notify(options: NotificationOptions): void {
        const { message, level = 'info', title, duration, action } = options;

        if (this.activeNotifications.length >= this.maxNotifications) { this.Dismiss(this.activeNotifications[0]); }

        const notification = document.createElement('div');
        notification.className = `notification notification--${level}`;

        if (title) {
            const titleElement = document.createElement('div');
            titleElement.className = 'notification-title';
            titleElement.textContent = title;
            notification.appendChild(titleElement);
        }

        const messageElement = document.createElement('div');
        messageElement.className = 'notification-message';
        messageElement.textContent = message;
        notification.appendChild(messageElement);

        if (action) {
            const actionElement = document.createElement('div');
            actionElement.className = 'notification-action';
            actionElement.textContent = action.label;
            actionElement.addEventListener('click', (e) => {
                e.stopPropagation();
                action.onClick();
            });
            notification.appendChild(actionElement);
        }

        this.container.appendChild(notification);
        this.activeNotifications.push(notification);
        this.pendingVisible.push(notification);

        const unsubscribeClick = Input.Instance?.OnScreenMouseDown(0, (e) => {
            if (notification.contains(e.target as Node)) { this.Dismiss(notification); }
        });
        if (unsubscribeClick) { this.notificationUnsubscribers.set(notification, unsubscribeClick); }

        if (duration > 0) { window.setTimeout(() => this.Dismiss(notification), duration); }

        LogManager.Instance?.Log({
            text: 'Notification shown.',
            options: { tags: ["UserInterface"], data: { message, level } }
        });
    }

    /**
     * Removes a notification from the active set and fades it out.
     * If the notification has not yet received its visible class (evicted before its first Update tick),
     * it is removed from the DOM immediately with no transition.
     */
    private Dismiss(notification: HTMLElement): void {
        const index = this.activeNotifications.indexOf(notification);
        if (index === -1) { return; }
        this.activeNotifications.splice(index, 1);

        const unsubscribe = this.notificationUnsubscribers.get(notification);
        if (unsubscribe) { unsubscribe(); this.notificationUnsubscribers.delete(notification); }

        const pendingIndex = this.pendingVisible.indexOf(notification);
        if (pendingIndex !== -1) {
            this.pendingVisible.splice(pendingIndex, 1);
            notification.remove();
            LogManager.Instance?.Log({
                text: 'Notification dismissed due to max notifications currently shown.',
                options: { tags: ["UserInterface"] }
            });
            return;
        }

        notification.classList.remove('notification--visible');
        notification.addEventListener('transitionend', () => notification.remove(), { once: true });

        LogManager.Instance?.Log({
            text: 'Notification dismissed.',
            options: { tags: ["UserInterface"] }
        });
    }

    public OnDestroy(): void {
        for (const unsubscribe of this.notificationUnsubscribers.values()) { unsubscribe(); }
        this.container.remove();
        if (NotificationManager.Instance === this) {
            NotificationManager.Instance = null;
            LogManager.Instance?.Log({
                text: 'Cleared NotificationManager singleton instance.',
                options: { tags: ["UserInterface", "NitrateProcessDestroy"] }
            });
        }
    }
}
