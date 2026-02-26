type Labels = Record<string, string | number | boolean>;

const counters = new Map<string, number>();
const histograms = new Map<string, { count: number; sum: number; max: number }>();

function normalizeLabels(labels?: Labels): string {
  if (!labels) {
    return '';
  }

  return Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(',');
}

function metricKey(name: string, labels?: Labels): string {
  const suffix = normalizeLabels(labels);
  return suffix ? `${name}|${suffix}` : name;
}

export function incrementCounter(name: string, labels?: Labels, value: number = 1): void {
  const key = metricKey(name, labels);
  const current = counters.get(key) ?? 0;
  counters.set(key, current + value);
}

export function observeHistogram(name: string, value: number, labels?: Labels): void {
  const key = metricKey(name, labels);
  const current = histograms.get(key) ?? { count: 0, sum: 0, max: 0 };
  current.count += 1;
  current.sum += value;
  current.max = Math.max(current.max, value);
  histograms.set(key, current);
}

export function getResilienceMetricsSnapshot() {
  return {
    counters: Object.fromEntries(counters.entries()),
    histograms: Object.fromEntries(histograms.entries()),
  };
}