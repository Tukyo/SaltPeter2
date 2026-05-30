export const MaterialTags = {
    dev: 0, // Materials tagged with this are for development purposes and not available during gameplay
    burns: 1, // Anything tagged with this will be consumed by fire
    corrodes: 2, // Anything tagged with this will be destroyed by acid
    meat: 3, // Meat variants, currently used to allow substances to rot meat
    rots_meat: 4, // Anything that rots meat
    rustable: 5, // Anything tags with this can rust
    rusts: 6, // Something that causes rust
    extinguishes: 7, // Materials that extinguish fire
} as const;

export type MaterialTag = keyof typeof MaterialTags;