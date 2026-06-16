import { AuditEnvelopeFactory } from './audit.factory';

describe('AuditEnvelopeFactory', () => {
    describe('createHttpEnvelope', () => {
        it('should create a valid HTTP audit envelope with an actor', () => {
            // Arrange
            const traceId = 'trace-123';
            const actorId = 'user-456';
            const payload = {
                http: {
                    method: 'POST',
                    path: '/orders',
                    status_code: 201,
                    latency_ms: 45,
                    ip: '127.0.0.1',
                }
            };

            // Act
            const envelope = AuditEnvelopeFactory.createHttpEnvelope(traceId, actorId, payload);

            // Assert
            expect(envelope.trace_id).toBe(traceId);
            expect(envelope.actor_id).toBe(actorId);
            expect(envelope.source).toBe('CORE_API');
            expect(envelope.event_type).toBe('HTTP_TRANSACTION');
            expect(envelope.payload).toEqual(payload);
            expect(envelope.created_at).toBeDefined();
        });

        it('should handle a missing actorId for unauthenticated routes', () => {
            // Arrange
            const traceId = 'trace-123';
            const payload = {
                http: {
                    method: 'GET',
                    path: '/health',
                    status_code: 200,
                    latency_ms: 10,
                    ip: '127.0.0.1'
                }
            };

            // Act
            const envelope = AuditEnvelopeFactory.createHttpEnvelope(traceId, null, payload);

            // Assert
            expect(envelope.actor_id).toBeNull();
        });
    });

    describe('createMutationEnvelope', () => {
        it('should create a valid DATA_MUTATION audit envelope', () => {
            // Arrange
            const traceId = 'trace-789';
            const actorId = 'user-999';
            const payload = {
                entity: 'products',
                entity_id: 'prod-1',
                operation: 'UPDATE' as const, // Casts the string to the literal type expected by the interface
                changes: { price: 100 },
            };

            // Act
            const envelope = AuditEnvelopeFactory.createMutationEnvelope(traceId, actorId, payload);

            // Assert
            expect(envelope.trace_id).toBe(traceId);
            expect(envelope.actor_id).toBe(actorId);
            expect(envelope.source).toBe('CORE_API');
            expect(envelope.event_type).toBe('DATA_MUTATION');
            expect(envelope.payload).toEqual(payload);
            expect(envelope.created_at).toBeDefined();
        });
    });
});