export declare class SeededRng {
    private state;
    constructor(seed: number);
    next(): number;
    nextInt(minInclusive: number, maxInclusive: number): number;
    chance(probability: number): boolean;
}
//# sourceMappingURL=seeded-rng.d.ts.map