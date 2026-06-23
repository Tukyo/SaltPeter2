import { Nitrate } from '@Nitrate';

export class PlayerController extends Nitrate.CustomComponent {
    private transform: Nitrate.Transform | null = null;

    private readonly moveSpeed: number = 3;

    public Awake(): void {
        this.transform = this.gameObject?.GetComponent(Nitrate.Transform) ?? null;
    }

    public Update(): void {
        if (!this.transform) { return; }
        const input = Nitrate.Input.Instance;
        if (!input) { return; }

        if (input.IsKeyCodeDown('KeyW') || input.IsKeyCodeDown('ArrowUp')) { this.transform.position.y += this.moveSpeed; }
        if (input.IsKeyCodeDown('KeyS') || input.IsKeyCodeDown('ArrowDown')) { this.transform.position.y -= this.moveSpeed; }
        if (input.IsKeyCodeDown('KeyA') || input.IsKeyCodeDown('ArrowLeft')) { this.transform.position.x -= this.moveSpeed; }
        if (input.IsKeyCodeDown('KeyD') || input.IsKeyCodeDown('ArrowRight')) { this.transform.position.x += this.moveSpeed; }
    }

    public OnDestroy(): void {
        this.transform = null;
    }
}
