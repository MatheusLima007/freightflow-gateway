"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDuplicateMode = getDuplicateMode;
exports.shuffleDeterministic = shuffleDeterministic;
exports.buildEventPlan = buildEventPlan;
const providers_1 = require("@freightflow/providers");
function getDuplicateMode(configured = process.env.SANDBOX_WEBHOOK_DUPLICATE_MODE) {
    if (configured === 'sameEventId' || configured === 'newEventId' || configured === 'mixed') {
        return configured;
    }
    return 'mixed';
}
function shuffleDeterministic(items, rng) {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index--) {
        const swapIndex = rng.nextInt(0, index);
        [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
}
function buildEventPlan(events, options) {
    const settings = (0, providers_1.getSandboxSettings)();
    const profile = (0, providers_1.getProviderSandboxProfile)('WEBHOOK');
    const rng = options?.rng ?? new providers_1.SeededRng(settings.seed + 101);
    const duplicateMode = options?.duplicateMode ?? getDuplicateMode();
    const chaosEnabled = options?.chaosEnabled ?? settings.chaosEnabled;
    const maybeReordered = chaosEnabled && rng.chance(profile.webhookChaos.reorderRate)
        ? shuffleDeterministic(events, rng)
        : events;
    return maybeReordered.map((event) => {
        const drop = chaosEnabled && rng.chance(profile.webhookChaos.dropRate);
        const duplicate = chaosEnabled && rng.chance(profile.webhookChaos.duplicateRate);
        const duplicateWithNewEventId = duplicate
            ? duplicateMode === 'newEventId' || (duplicateMode === 'mixed' && rng.chance(0.5))
            : false;
        return {
            event,
            drop,
            duplicate,
            duplicateWithNewEventId,
            profile: profile.name,
        };
    });
}
//# sourceMappingURL=webhook-chaos.js.map