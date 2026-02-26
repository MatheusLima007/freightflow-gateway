import { SeededRng, resetSandboxRuntimeForTests } from '@freightflow/providers';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildEventPlan, getDuplicateMode, shuffleDeterministic } from './webhook-chaos';

describe('webhook chaos planner', () => {
  const previousSeed = process.env.SANDBOX_SEED;
  const previousChaosEnabled = process.env.SANDBOX_CHAOS_ENABLED;
  const previousWebhookProfile = process.env.PROVIDER_SANDBOX_PROFILE_WEBHOOK;

  beforeEach(() => {
    process.env.SANDBOX_SEED = '42';
    process.env.SANDBOX_CHAOS_ENABLED = 'true';
    process.env.PROVIDER_SANDBOX_PROFILE_WEBHOOK = 'flaky';
    resetSandboxRuntimeForTests();
  });

  afterEach(() => {
    process.env.SANDBOX_SEED = previousSeed;
    process.env.SANDBOX_CHAOS_ENABLED = previousChaosEnabled;
    process.env.PROVIDER_SANDBOX_PROFILE_WEBHOOK = previousWebhookProfile;
    resetSandboxRuntimeForTests();
  });

  it('gera plano determinístico com mesma seed', () => {
    const events = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const left = buildEventPlan(events, { rng: new SeededRng(77), duplicateMode: 'mixed', chaosEnabled: true });
    const right = buildEventPlan(events, { rng: new SeededRng(77), duplicateMode: 'mixed', chaosEnabled: true });

    expect(left).toEqual(right);
  });

  it('desliga caos quando SANDBOX_CHAOS_ENABLED=false', () => {
    const events = [{ id: '1' }, { id: '2' }];
    const plan = buildEventPlan(events, { rng: new SeededRng(77), duplicateMode: 'mixed', chaosEnabled: false });

    expect(plan.every((item) => !item.drop && !item.duplicate)).toBe(true);
  });

  it('embaralha determinísticamente', () => {
    const shuffled = shuffleDeterministic([1, 2, 3, 4], new SeededRng(9));
    expect(shuffled).toEqual([2, 4, 3, 1]);
  });

  it('interpreta modo de duplicação', () => {
    expect(getDuplicateMode('sameEventId')).toBe('sameEventId');
    expect(getDuplicateMode('newEventId')).toBe('newEventId');
    expect(getDuplicateMode('invalid-mode')).toBe('mixed');
  });
});
