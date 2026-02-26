import { SeededRng, getProviderSandboxProfile, getSandboxSettings } from '@freightflow/providers';

type DuplicateMode = 'sameEventId' | 'newEventId' | 'mixed';

export interface WebhookChaosPlan<TEvent> {
  event: TEvent;
  drop: boolean;
  duplicate: boolean;
  duplicateWithNewEventId: boolean;
  profile: string;
}

export function getDuplicateMode(configured = process.env.SANDBOX_WEBHOOK_DUPLICATE_MODE): DuplicateMode {
  if (configured === 'sameEventId' || configured === 'newEventId' || configured === 'mixed') {
    return configured;
  }
  return 'mixed';
}

export function shuffleDeterministic<T>(items: T[], rng: SeededRng): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = rng.nextInt(0, index);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function buildEventPlan<TEvent>(
  events: TEvent[],
  options?: {
    rng?: SeededRng;
    duplicateMode?: DuplicateMode;
    chaosEnabled?: boolean;
  }
): Array<WebhookChaosPlan<TEvent>> {
  const settings = getSandboxSettings();
  const profile = getProviderSandboxProfile('WEBHOOK');
  const rng = options?.rng ?? new SeededRng(settings.seed + 101);
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
