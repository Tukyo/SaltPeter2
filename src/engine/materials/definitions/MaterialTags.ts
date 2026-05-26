export const MaterialTags = {
    dev: 0, // Materials tagged with this are for development purposes and not available during gameplay
    burns: 1, // Anything tagged with this will be consumed by fire
    corrodes: 2, // Anything tagged with this will be destroyed by acid
    meat: 3, // Meat variants, currently used to allow substances to rot meat,
    rusts: 4 // Anything tags with this can rust
} as const;

export type MaterialTag = keyof typeof MaterialTags;