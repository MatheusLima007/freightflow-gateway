type Labels = Record<string, string | number | boolean>;
export declare function incrementCounter(name: string, labels?: Labels, value?: number): void;
export declare function observeHistogram(name: string, value: number, labels?: Labels): void;
export declare function getResilienceMetricsSnapshot(): {
    counters: {
        [k: string]: number;
    };
    histograms: {
        [k: string]: {
            count: number;
            sum: number;
            max: number;
        };
    };
};
export {};
//# sourceMappingURL=resilience-metrics.d.ts.map