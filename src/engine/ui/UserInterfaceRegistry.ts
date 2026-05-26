import type { ControlEntry, UISetting, UIControlElement } from './UserInterfaceTypes';

// @omitfromdocs
export interface ControlHandler<S extends UISetting = UISetting> {
    Build(key: string, setting: S): { wrapper: HTMLElement; element: UIControlElement; readout?: HTMLSpanElement; sync?: () => void; isValue: boolean };
    Bind(key: string, element: UIControlElement, entry: ControlEntry, fireChange: () => void, onAction: ((key: string, action: string) => void) | null): void;
    GetRawValue(element: UIControlElement, setting: S): number | string;
    GetModelValue?(raw: number | string, setting: S): number | string;
}

/**
 * Maps UI control type strings to their {@link ControlHandler} implementations.
 * Controls register themselves at startup; panels resolve handlers at build time.
 */
export class UserInterfaceRegistry {
    private static readonly handlers: Partial<Record<UISetting['type'], ControlHandler>> = {};

    /** Registers a control handler for a given setting type. @internal */
    public static Register<S extends UISetting>(type: S['type'], handler: ControlHandler<S>): void {
        UserInterfaceRegistry.handlers[type] = handler as ControlHandler;
    }

    /** Returns the registered handler for a setting type, or null if none is registered. @internal */
    public static Get(type: UISetting['type']): ControlHandler | null {
        return UserInterfaceRegistry.handlers[type] ?? null;
    }
}
