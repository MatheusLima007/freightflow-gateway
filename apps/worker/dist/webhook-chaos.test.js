"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const providers_1 = require("@freightflow/providers");
const vitest_1 = require("vitest");
const webhook_chaos_1 = require("./webhook-chaos");
(0, vitest_1.describe)('webhook chaos planner', () => {
    const previousSeed = process.env.SANDBOX_SEED;
    const previousChaosEnabled = process.env.SANDBOX_CHAOS_ENABLED;
    const previousWebhookProfile = process.env.PROVIDER_SANDBOX_PROFILE_WEBHOOK;
    (0, vitest_1.beforeEach)(() => {
        process.env.SANDBOX_SEED = '42';
        process.env.SANDBOX_CHAOS_ENABLED = 'true';
        process.env.PROVIDER_SANDBOX_PROFILE_WEBHOOK = 'flaky';
        (0, providers_1.resetSandboxRuntimeForTests)();
    });
    (0, vitest_1.afterEach)(() => {
        process.env.SANDBOX_SEED = previousSeed;
        process.env.SANDBOX_CHAOS_ENABLED = previousChaosEnabled;
        process.env.PROVIDER_SANDBOX_PROFILE_WEBHOOK = previousWebhookProfile;
        (0, providers_1.resetSandboxRuntimeForTests)();
    });
    (0, vitest_1.it)('gera plano determinístico com mesma seed', () => {
        const events = [{ id: '1' }, { id: '2' }, { id: '3' }];
        const left = (0, webhook_chaos_1.buildEventPlan)(events, { rng: new providers_1.SeededRng(77), duplicateMode: 'mixed', chaosEnabled: true });
        const right = (0, webhook_chaos_1.buildEventPlan)(events, { rng: new providers_1.SeededRng(77), duplicateMode: 'mixed', chaosEnabled: true });
        (0, vitest_1.expect)(left).toEqual(right);
    });
    (0, vitest_1.it)('desliga caos quando SANDBOX_CHAOS_ENABLED=false', () => {
        const events = [{ id: '1' }, { id: '2' }];
        const plan = (0, webhook_chaos_1.buildEventPlan)(events, { rng: new providers_1.SeededRng(77), duplicateMode: 'mixed', chaosEnabled: false });
        (0, vitest_1.expect)(plan.every((item) => !item.drop && !item.duplicate)).toBe(true);
    });
    (0, vitest_1.it)('embaralha determinísticamente', () => {
        const shuffled = (0, webhook_chaos_1.shuffleDeterministic)([1, 2, 3, 4], new providers_1.SeededRng(9));
        (0, vitest_1.expect)(shuffled).toEqual([2, 4, 3, 1]);
    });
    (0, vitest_1.it)('interpreta modo de duplicação', () => {
        (0, vitest_1.expect)((0, webhook_chaos_1.getDuplicateMode)('sameEventId')).toBe('sameEventId');
        (0, vitest_1.expect)((0, webhook_chaos_1.getDuplicateMode)('newEventId')).toBe('newEventId');
        (0, vitest_1.expect)((0, webhook_chaos_1.getDuplicateMode)('invalid-mode')).toBe('mixed');
    });
});
//# sourceMappingURL=webhook-chaos.test.js.map