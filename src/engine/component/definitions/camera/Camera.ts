import { Component } from '../../Component';

import iconUrl from './icon.png';

/** Marks a GameObject as the active scene camera. Position is read from the GO's Transform. */
export class Camera extends Component {
    static readonly label = 'Camera';
    static readonly icon = iconUrl;
    readonly type = 'Camera' as const;

    private static active: Camera | null = null;

    /** Returns the active Camera component in the scene, or null if none exists. */
    public static get Main(): Camera | null { return Camera.active; }

    public Awake(): void { Camera.active = this; }
    public OnDisable(): void { if (Camera.active === this) { Camera.active = null; } }
}
