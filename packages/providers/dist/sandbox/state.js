"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSandboxSettings = getSandboxSettings;
exports.getProviderSandboxProfileName = getProviderSandboxProfileName;
exports.getProviderSandboxProfile = getProviderSandboxProfile;
exports.isSandboxProfileKnown = isSandboxProfileKnown;
exports.setProviderSandboxProfile = setProviderSandboxProfile;
exports.incrementSandboxCounter = incrementSandboxCounter;
exports.getSandboxStatusSnapshot = getSandboxStatusSnapshot;
exports.resetSandboxRuntimeForTests = resetSandboxRuntimeForTests;
const fs_1 = require("fs");
const observability_1 = require("@freightflow/observability");
const profiles_1 = require("./profiles");
const runtimeProfileOverrides = new Map();
const counters = new Map();
let runtimeSettings = null;
function parseBoolean(value, fallback) {
    if (value === undefined)
        return fallback;
    return value === 'true' || value === '1';
}
function parseNumber(value, fallback) {
    if (!value)
        return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function readSandboxJson(path) {
    if (!path)
        return {};
    try {
        const raw = (0, fs_1.readFileSync)(path, 'utf-8');
        const json = JSON.parse(raw);
        return json;
    }
    catch (error) {
        observability_1.logger.warn({ path, error: error instanceof Error ? error.message : String(error) }, 'Unable to read sandbox config file, using defaults');
        return {};
    }
}
function normalizeProviderKey(providerId) {
    return providerId.trim().toUpperCase();
}
function getSandboxSettings() {
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
function resolveEnvProfile(providerId) {
    const envKey = `PROVIDER_SANDBOX_PROFILE_${normalizeProviderKey(providerId)}`;
    return process.env[envKey];
}
function getProviderSandboxProfileName(providerId) {
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
function getProviderSandboxProfile(providerId) {
    const name = getProviderSandboxProfileName(providerId);
    return profiles_1.SANDBOX_PROFILES[name] ?? profiles_1.SANDBOX_PROFILES.default;
}
function isSandboxProfileKnown(profile) {
    return profile in profiles_1.SANDBOX_PROFILES;
}
function setProviderSandboxProfile(providerId, profile) {
    const normalizedProvider = normalizeProviderKey(providerId);
    runtimeProfileOverrides.set(normalizedProvider, profile);
    return { providerId: normalizedProvider, profile };
}
function incrementSandboxCounter(providerId, operation, outcome) {
    const key = `${normalizeProviderKey(providerId)}:${operation}:${outcome}`;
    const current = counters.get(key) ?? 0;
    counters.set(key, current + 1);
}
function getSandboxStatusSnapshot() {
    const settings = getSandboxSettings();
    const profiles = {};
    for (const key of Object.keys(profiles_1.SANDBOX_PROFILES)) {
        profiles[key] = key;
    }
    return {
        settings,
        availableProfiles: profiles,
        runtimeOverrides: Object.fromEntries(runtimeProfileOverrides.entries()),
        counters: Object.fromEntries(counters.entries()),
    };
}
function resetSandboxRuntimeForTests() {
    runtimeSettings = null;
    runtimeProfileOverrides.clear();
    counters.clear();
}
//# sourceMappingURL=state.js.map