import { MaterialRegistry } from '../materials/MaterialRegistry';
import type { PingPongTargets } from './PingPongTargets';

/**
 * Seeds the simulation textures with default values before the first frame.
 *
 * Currently pre-fills both physics texture pairs with air's resting temperature
 * so cells start at ambient rather than absolute zero.
 */
export class SimulationInitializer {
    constructor(device: GPUDevice, pingPong: PingPongTargets) {
        const ambientTemp = MaterialRegistry.Materials.air.physics.temperature.restingTemperature;
        const ambientData = new Float32Array(pingPong.width * pingPong.height * 4);
        for (let i = 0; i < pingPong.width * pingPong.height; i++) {
            ambientData[i * 4] = ambientTemp;
        }
        const layout = { bytesPerRow: pingPong.width * 16 };
        const size: GPUExtent3DStrict = [pingPong.width, pingPong.height];
        device.queue.writeTexture({ texture: pingPong.currentPhysics }, ambientData, layout, size);
        device.queue.writeTexture({ texture: pingPong.nextPhysics }, ambientData, layout, size);
    }
}
