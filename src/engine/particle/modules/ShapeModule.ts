import type { Size2D } from '../../definitions/Primitives';

export interface ParticleShapeModule {
    box?: ParticleBoxShape;
    circle?: ParticleCircleShape;
    cone?: ParticleConeShape;
}

export interface ParticleBoxShape {
    size: Size2D; // Size of the box
}

export interface ParticleCircleShape {
    radius: number; // Radius of the circle
}

export interface ParticleConeShape {
    angle: number; // Spread of the cone
    direction: { // Direction of the cone
        x: number;
        y: number;
    }
    length: number; // Length of the cone
}
