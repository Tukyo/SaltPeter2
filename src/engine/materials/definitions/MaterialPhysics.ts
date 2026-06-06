export interface MaterialPhysics {
    contact: {
        // Resistance to sliding against other surfaces | 0 = frictionless, 1 = maximum grip
        friction: number;
        // Elasticity on collision | 0 = absorbs impact fully, 1 = returns all energy
        restitution: number;
        // Resistance to penetration | low = soft surface yields before pushing back, high = immediate resistance
        hardness: number;
    }
    // Controls the physical density, allows lighter materials to be pushed aside by denser ones
    density: number;
    // Used for damage resistance
    durability: number;
    // How easily the material burns (material must also be tagged with 'burns' to be flagged as a fuel source)
    flammability?: number;
    temperature: {
        // Resistance to absorbing neighbor temperatures | low = fast conductor, high = slow conductor
        specificHeat: number;
        // Desired temperature for materials (spawns at this temp, tries to return to it)
        restingTemperature: number;
        // How strongly this material tries to return to it's restingTemperature
        restingStrength: number;
    }
}
