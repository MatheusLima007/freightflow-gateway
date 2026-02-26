import { readFileSync } from 'fs';
import { logger } from '@freightflow/observability';
import { SANDBOX_PROFILES } from './profiles';
import { SandboxProfile, SandboxRuntimeSettings } from './types';

interface SandboxJsonConfig {
  seed?: number;
  chaosEnabled?: boolean;
  rateLimitEnabled?: boolean;
  providerProfiles?: Record<string, string>;
}

type SandboxCounterKey = `${string}:${string}:${string}`;

const runtimeProfileOverrides = new Map<string, string>();
const counters = new Map<SandboxCounterKey, number>();

let runtimeSettings: SandboxRuntimeSettings | null = null;

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readSandboxJson(path?: string): SandboxJsonConfig {
  if (!path) return {};

  try {
    const raw = readFileSync(path, 'utf-8');
    const json = JSON.parse(raw) as SandboxJsonConfig;
    return json;
  } catch (error) {
    logger.warn({ path, error: error instanceof Error ? error.message : String(error) }, 'Unable to read sandbox config file, using defaults');
    return {};
  }
}

function normalizeProviderKey(providerId: string): string {
  return providerId.trim().toUpperCase();
}

export function getSandboxSettings(): SandboxRuntimeSettings {
  if (runtimeSettings) {
    return runtimeSettings;
  }

  const configPath = process.env.SANDBOX_CONFIG_PATH;
  const fileConfig = readSandboxJson(configPath);

  runtimeSettings = {
    seed: parseNumber(process.env.SANDBOX_SEED, fileConfig.seed ?? 20260226),
    chaosEnabled: parseBoolean(process.env.SANDBOX_CHAOS_ENABLED, fileConfig.chaosEnabled ?? true),
    rateLimitEnabled: parseBoolean(process.env.SANDBOX_RATE_LIMIT_ENABLED, fileConfig.rateLimitEnabled ?? true),
    configPath,
  };

  if (fileConfig.providerProfiles) {
    for (const [providerId, profile] of Object.entries(fileConfig.providerProfiles)) {
      runtimeProfileOverrides.set(normalizeProviderKey(providerId), profile);
    }
  }

  return runtimeSettings;
}

function resolveEnvProfile(providerId: string): string | undefined {
  const envKey = `PROVIDER_SANDBOX_PROFILE_${normalizeProviderKey(providerId)}`;
  return process.env[envKey];
}

export function getProviderSandboxProfileName(providerId: string): string {
  const normalizedProvider = normalizeProviderKey(providerId);
  const runtimeOverride = runtimeProfileOverrides.get(normalizedProvider);
  if (runtimeOverride) {
    return runtimeOverride;
  }

  const envProfile = resolveEnvProfile(normalizedProvider);
  if (envProfile) {
    return envProfile;
  }

  return 'default';
}

export function getProviderSandboxProfile(providerId: string): SandboxProfile {
  const name = getProviderSandboxProfileName(providerId);
  return SANDBOX_PROFILES[name] ?? SANDBOX_PROFILES.default;
}

export function isSandboxProfileKnown(profile: string): boolean {
  return profile in SANDBOX_PROFILES;
}

export function setProviderSandboxProfile(providerId: string, profile: string): { providerId: string; profile: string } {
  const normalizedProvider = normalizeProviderKey(providerId);
  runtimeProfileOverrides.set(normalizedProvider, profile);
  return { providerId: normalizedProvider, profile };
}

export function incrementSandboxCounter(providerId: string, operation: string, outcome: string): void {
  const key: SandboxCounterKey = `${normalizeProviderKey(providerId)}:${operation}:${outcome}`;
  const current = counters.get(key) ?? 0;
  counters.set(key, current + 1);
}

export function getSandboxStatusSnapshot() {
  const settings = getSandboxSettings();
  const profiles: Record<string, string> = {};
  for (const key of Object.keys(SANDBOX_PROFILES)) {
    profiles[key] = key;
  }

  return {
    settings,
    availableProfiles: profiles,
    runtimeOverrides: Object.fromEntries(runtimeProfileOverrides.entries()),
    counters: Object.fromEntries(counters.entries()),
  };
}

export function resetSandboxRuntimeForTests(): void {
  runtimeSettings = null;
  runtimeProfileOverrides.clear();
  counters.clear();
}
