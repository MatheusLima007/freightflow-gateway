import { FastifyInstance } from 'fastify';
type TrackingEvent = {
    date: Date;
    description: string;
    location?: string;
    eventId?: string;
};
export declare function normalizeTrackingEvents(events: TrackingEvent[]): TrackingEvent[];
export declare function trackingsRoutes(app: FastifyInstance): Promise<void>;
export {};
//# sourceMappingURL=trackings.d.ts.map