import { Nitrate } from '@Nitrate';

// How fast the camera closes the gap to its target, in 1/seconds. Frame-rate independent.
// Higher = snappier follow (less smoothing), lower = floatier (more lag).
const STIFFNESS = 10;

export class CameraController extends Nitrate.CustomComponent {
    private transform: Nitrate.Transform | null = null;
    private followTarget: Nitrate.Transform | null = null;

    public Awake(): void {
        this.transform = this.gameObject?.GetComponent(Nitrate.Transform) ?? null;
    }

    public SetFollowTarget(target: Nitrate.Transform): void {
        this.followTarget = target;
    }

    public Update(): void {
        if (!this.transform || !this.followTarget) { return; }

        // Exponential smoothing toward the target. The player's position arrives via async GPU
        // readback in bursts; moving a fraction of the gap every frame keeps the camera — and
        // therefore the render crop offset — changing smoothly regardless of when the readback lands.
        const t = 1 - Math.exp(-STIFFNESS * Nitrate.Time.deltaTime);
        this.transform.position.x += (this.followTarget.position.x - this.transform.position.x) * t;
        this.transform.position.y += (this.followTarget.position.y - this.transform.position.y) * t;
    }

    public OnDestroy(): void {
        this.transform = null;
        this.followTarget = null;
    }
}
