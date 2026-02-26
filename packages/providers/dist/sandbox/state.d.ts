import { SandboxProfile, SandboxRuntimeSettings } from './types';
export declare function getSandboxSettings(): SandboxRuntimeSettings;
export declare function getProviderSandboxProfileName(providerId: string): string;
export declare function getProviderSandboxProfile(providerId: string): SandboxProfile;
export declare function isSandboxProfileKnown(profile: string): boolean;
export declare function setProviderSandboxProfile(providerId: string, profile: string): {
    providerId: string;
    profile: string;
};
export declare function incrementSandboxCounter(providerId: string, operation: string, outcome: string): void;
export declare function getSandboxStatusSnapshot(): {
    settings: SandboxRuntimeSettings;
    availableProfiles: Record<string, string>;
    runtimeOverrides: {
        [k: string]: string;
    };
    counters: {
        [k: string]: number;
    };
};
export declare function resetSandboxRuntimeForTests(): void;
//# sourceMappingURL=state.d.ts.map