import { SeededRng } from '@freightflow/providers';
type DuplicateMode = 'sameEventId' | 'newEventId' | 'mixed';
export interface WebhookChaosPlan<TEvent> {
    event: TEvent;
    drop: boolean;
    duplicate: boolean;
    duplicateWithNewEventId: boolean;
    profile: string;
}
export declare function getDuplicateMode(configured?: string | undefined): DuplicateMode;
export declare function shuffleDeterministic<T>(items: T[], rng: SeededRng): T[];
export declare function buildEventPlan<TEvent>(events: TEvent[], options?: {
    rng?: SeededRng;
    duplicateMode?: DuplicateMode;
    chaosEnabled?: boolean;
}): Array<WebhookChaosPlan<TEvent>>;
export {};
//# sourceMappingURL=webhook-chaos.d.ts.map