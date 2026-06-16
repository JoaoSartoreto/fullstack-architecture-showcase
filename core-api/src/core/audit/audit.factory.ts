export interface HttpPayload {
    http: {
        method: string;
        path: string;
        status_code: number;
        latency_ms: number;
        ip: string;
    };
    error?: {
        code: string;
        message: string;
    };
}

export interface MutationPayload {
    entity: string;
    entity_id: string;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    changes?: Record<string, any>;
}

export class AuditEnvelopeFactory {
    
    static createHttpEnvelope(
        traceId: string,
        actorId: string | null,
        payload: HttpPayload
    ) {
        return {
            trace_id: traceId,
            source: 'CORE_API',
            event_type: 'HTTP_TRANSACTION',
            actor_id: actorId,
            created_at: new Date().toISOString(),
            payload: payload,
        };
    }

    static createMutationEnvelope(
        traceId: string,
        actorId: string | null,
        payload: MutationPayload
    ) {
        return {
            trace_id: traceId,
            source: 'CORE_API',
            event_type: 'DATA_MUTATION',
            actor_id: actorId,
            created_at: new Date().toISOString(),
            payload: payload,
        };
    }
}