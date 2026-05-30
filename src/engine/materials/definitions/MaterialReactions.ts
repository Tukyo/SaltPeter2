import type { MaterialName } from './MaterialIdentity';
import type { MaterialTag } from './MaterialTags';

// Bit flags for which neighbors a reaction checks. 0 = all 8 (default).
// Texture space: Y+ is screen-down (simY-), Y- is screen-up (simY+).
// @omitfromdocs
export const NeighborMask = {
    Down: 1 << 0,  // (0, +1)  screen-down  = simY-
    Up: 1 << 1,  // (0, -1)  screen-up    = simY+
    Right: 1 << 2,  // (+1, 0)
    Left: 1 << 3,  // (-1, 0)
    DownRight: 1 << 4,  // (+1, +1)
    DownLeft: 1 << 5,  // (-1, +1)
    UpRight: 1 << 6,  // (+1, -1)
    UpLeft: 1 << 7,  // (-1, -1)
} as const;

/** Material reaction products can be explicit or maintain the original material. */
export type MaterialReactionProduct = MaterialName | 'self';

export interface MaterialReactionReagent {
    materials?: MaterialName[];
    tags?: MaterialTag[];
}

export interface MaterialReaction {
    reagents: MaterialReactionReagent[];
    product: MaterialReactionProduct[];
    biproduct?: MaterialName;
    reactionRate: number;
    neighborMask?: number;
}

// Reaction system overview:
//
// Each tick, every occupied cell checks all 4 cell neighbors.
// Formula: 'probability = 1 - exp(-chance * deltaTime)' where chance = 1 / reactionRate.
//
// reactionRate is in real seconds — a rate of 10 means ~10 seconds to react
// when touching exactly ONE reactive neighbor. Each additional reactive neighbor
// multiplies the effective rate: 4 neighbors = ~2.5 seconds at rate 10.
//
// Reagents can match by material name or by tag (any material with that tag).
// Products are ordered: product[0] replaces reagent[0]'s cell, product[1] replaces reagent[1]'s cell.
// Reactions are registered bidirectionally (A+B == B+A).
// @omitfromdocs
export const Reactions: MaterialReaction[] = [
    {
        reagents: [{ materials: ['salt'] }, { materials: ['water'] }],
        product: ['saltwater', 'saltwater'],
        reactionRate: 30
    },
    {
        reagents: [{ materials: ['salt'] }, { materials: ['saltwater'] }],
        product: ['saltwater', 'brine'],
        reactionRate: 500
    },
    {
        reagents: [{ materials: ['salt'] }, { materials: ['brine'] }],
        product: ['brine', 'brine'],
        reactionRate: 1000
    },
    {
        reagents: [{ materials: ['acid'] }, { materials: ['water'] }],
        product: ['water', 'water'],
        reactionRate: 20
    },
    {
        reagents: [{ materials: ['water'] }, { materials: ['moss'] }],
        product: ['peat', 'peat'],
        reactionRate: 20
    },
    {
        reagents: [{ materials: ['water'] }, { materials: ['lava'] }],
        product: ['stone', 'stone'],
        reactionRate: 1
    },
    {
        reagents: [{ materials: ['saltwater'] }, { materials: ['lava'] }],
        product: ['steam', 'salt'],
        reactionRate: 60
    },
    {
        reagents: [{ materials: ['brine'] }, { materials: ['lava'] }],
        product: ['steam', 'salt'],
        reactionRate: 80
    },
    {
        reagents: [{ materials: ['water'] }, { materials: ['dirt'] }],
        product: ['mud', 'water'],
        reactionRate: 80
    },
    {
        reagents: [{ materials: ['water'] }, { materials: ['milk_powder'] }],
        product: ['milk', 'milk'],
        reactionRate: 10
    },
    {
        reagents: [{ materials: ['water'] }, { materials: ['feces'] }],
        product: ['diarrhea', 'diarrhea'],
        reactionRate: 100
    },
    {
        reagents: [{ materials: ['water'] }, { materials: ['concrete_powder'] }],
        product: ['cement', 'cement'],
        reactionRate: 15
    },
    {
        reagents: [{ materials: ['cement'] }, { materials: ['air'] }],
        product: ['concrete', 'air'],
        reactionRate: 1000
    },
    {
        reagents: [{ materials: ['water'] }, { materials: ['coffee_grounds'] }],
        product: ['coffee', 'coffee'],
        reactionRate: 100
    },
    {
        reagents: [{ materials: ['coffee'] }, { materials: ['coffee_grounds'] }],
        product: ['coffee', 'coffee'],
        reactionRate: 100
    },
    {
        reagents: [{ materials: ['coffee'] }, { materials: ['milk'] }],
        product: ['latte', 'latte'],
        reactionRate: 100
    },
    {
        reagents: [{ materials: ['latte'] }, { materials: ['milk'] }],
        product: ['latte', 'latte'],
        reactionRate: 200
    },
    {
        reagents: [{ materials: ['fire'] }, { tags: ['burns'] }],
        product: ['fire', 'fire'],
        biproduct: 'smoke',
        reactionRate: 1,
    },
    {
        reagents: [{ tags: ['extinguishes'] }, { materials: ['fire'] }],
        product: ['self', 'smoke'],
        reactionRate: 1
    },
    {
        reagents: [{ materials: ['acid'] }, { tags: ['corrodes'] }],
        product: ['flammable_gas', 'flammable_gas'],
        reactionRate: 0.5
    },
    {
        reagents: [{ materials: ['lava'] }, { tags: ['burns'] }],
        product: ['self', 'fire'],
        biproduct: 'smoke',
        reactionRate: 2,
    },
    {
        reagents: [{ materials: ['fire'] }, { materials: ['meat'] }],
        product: ['air', 'meat_cooked'],
        reactionRate: 5,
    },
    {
        reagents: [{ materials: ['fire'] }, { materials: ['meat_cooked'] }],
        product: ['smoke', 'meat_burned'],
        biproduct: 'smoke',
        reactionRate: 4,
    },
    {
        reagents: [{ materials: ['fire'] }, { materials: ['meat_burned'] }],
        product: ['smoke', 'ash'],
        biproduct: 'smoke',
        reactionRate: 2,
    },
    {
        reagents: [{ tags: ['rots_meat'] }, { tags: ['meat'] }],
        product: ['self', 'meat_rotten'],
        reactionRate: 10,
    },
    {
        reagents: [{ tags: ['rusts'] }, { tags: ['rustable'] }],
        product: ['self', 'rust'],
        reactionRate: 100,
    },
    {
        reagents: [{ materials: ['ice'] }, { materials: ['salt'] }],
        product: ['water', 'salt'],
        reactionRate: 200,
    },
    {
        reagents: [{ materials: ['ice'] }, { materials: ['saltwater'] }],
        product: ['water', 'saltwater'],
        reactionRate: 125,
    },
    {
        reagents: [{ materials: ['ice'] }, { materials: ['brine'] }],
        product: ['water', 'saltwater'],
        reactionRate: 100,
    },
    {
        reagents: [{ materials: ['snow'] }, { materials: ['salt'] }],
        product: ['water', 'salt'],
        reactionRate: 100,
    },
    {
        reagents: [{ materials: ['snow'] }, { materials: ['saltwater'] }],
        product: ['water', 'saltwater'],
        reactionRate: 90,
    },
    {
        reagents: [{ materials: ['snow'] }, { materials: ['brine'] }],
        product: ['water', 'saltwater'],
        reactionRate: 85,
    },
    {
        reagents: [{ materials: ['soil'] }, { materials: ['air'] }],
        product: ['grass', 'soil'],
        reactionRate: 1
    },
    {
        reagents: [{ materials: ['water'] }, { materials: ['soil'] }],
        product: ['self', 'mud'],
        reactionRate: 90
    },
];