"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incrementCounter = incrementCounter;
exports.observeHistogram = observeHistogram;
exports.getResilienceMetricsSnapshot = getResilienceMetricsSnapshot;
const counters = new Map();
const histograms = new Map();
function normalizeLabels(labels) {
    if (!labels) {
        return '';
    }
    return Object.entries(labels)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${String(value)}`)
        .join(',');
}
function metricKey(name, labels) {
    const suffix = normalizeLabels(labels);
    return suffix ? `${name}|${suffix}` : name;
}
function incrementCounter(name, labels, value = 1) {
    const key = metricKey(name, labels);
    const current = counters.get(key) ?? 0;
    counters.set(key, current + value);
}
function observeHistogram(name, value, labels) {
    const key = metricKey(name, labels);
    const current = histograms.get(key) ?? { count: 0, sum: 0, max: 0 };
    current.count += 1;
    current.sum += value;
    current.max = Math.max(current.max, value);
    histograms.set(key, current);
}
function getResilienceMetricsSnapshot() {
    return {
        counters: Object.fromEntries(counters.entries()),
        histograms: Object.fromEntries(histograms.entries()),
    };
}
//# sourceMappingURL=resilience-metrics.js.map