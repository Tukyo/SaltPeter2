import type { Camera } from '../../../component/definitions/camera/Camera';

import { ComponentField } from '../ComponentField';

export class CameraField extends ComponentField<Camera> {
    public static readonly forType = 'Camera';
    public static readonly menu = 'Rendering/'

    protected BuildFields(): void { }
}
