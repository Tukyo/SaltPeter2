import { MaterialRegistry } from '../materials/MaterialRegistry';
import type { GameObjectLayer } from '../game_object/GameObjectLayer';
import type { SimulationLayer } from './SimulationLayer';

/**
 * Seeds physics textures on all layers with air's resting temperature
 * so all cells start at ambient rather than absolute zero.
 */
export class SimulationInitializer {
    constructor(device: GPUDevice, simulationLayer: SimulationLayer, gameObjectLayer: GameObjectLayer) {
        const ambientTemp = MaterialRegistry.Materials.air.physics.temperature.restingTemperature;
        const ambientData = new Float32Array(simulationLayer.width * simulationLayer.height * 4);
        for (let i = 0; i < simulationLayer.width * simulationLayer.height; i++) {
            ambientData[i * 4] = ambientTemp;
        }
        const layout = { bytesPerRow: simulationLayer.width * 16 };
        const size: GPUExtent3DStrict = [simulationLayer.width, simulationLayer.height];
        device.queue.writeTexture({ texture: simulationLayer.currentPhysics }, ambientData, layout, size);
        device.queue.writeTexture({ texture: simulationLayer.nextPhysics }, ambientData, layout, size);
        device.queue.writeTexture({ texture: gameObjectLayer.currentPhysics }, ambientData, layout, size);
        device.queue.writeTexture({ texture: gameObjectLayer.nextPhysics }, ambientData, layout, size);
    }
}
