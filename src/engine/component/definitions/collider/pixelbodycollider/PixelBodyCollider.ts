import { Collider } from "../Collider";

import iconUrl from './icon.png';

export class PixelBodyCollider extends Collider {
    static readonly label = 'Pixel Body Collider';
    static readonly icon = iconUrl;
    readonly type = 'PixelBodyCollider' as const;
    // Starts dirty so it builds on first frame. Also used to flag for rebuilding on pixeldata change.
    dirty: boolean = true;
}