import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request } from 'express';
import { RABBITMQ_CLIENT_TOKEN } from '../messaging/messaging.config';
import { AuditEnvelopeFactory } from './audit.factory';

@Injectable()
export class AuditService {
    constructor(
        @Inject(RABBITMQ_CLIENT_TOKEN) private readonly rmqClient: ClientProxy,
    ) { }

    private readonly logger = new Logger(AuditService.name);

    public logHttpTransaction(
        req: Request,
        statusCode: number,
        latencyMs: number,
        error?: any
    ): void {
        try {
            const traceId = req['traceId'];
            const actorId = req.user ? req.user['sub'] : null;

            const envelope = AuditEnvelopeFactory.createHttpEnvelope(traceId, actorId, {
                http: {
                    method: req.method,
                    path: req.url,
                    status_code: statusCode,
                    latency_ms: latencyMs,
                    ip: req.ip,
                },
                ...(error && {
                    error: {
                        code: error.name || 'UNKNOWN_ERROR',
                        message: error.message,
                    },
                }),
            });

            this.rmqClient.emit('audit_logs_queue', envelope).subscribe({
                error: (err) => {
                    // Fallback: If broker is unreachable, log the full payload to standard output 
                    // so container aggregators (like ELK/Datadog) can still parse the JSON.
                    this.logger.error(
                        `Broker unreachable. Dropping HTTP log for Trace: ${traceId}. Payload: ${JSON.stringify(envelope)}`,
                        err.stack
                    );
                }
            });
        } catch (fatalError) {
            this.logger.error(
                `Fatal error attempting to construct or send HTTP Audit log. Trace: ${req['traceId']}`,
                fatalError instanceof Error ? fatalError.stack : String(fatalError)
            );
        }
    }

    // Preparado para o futuro!
    public logDataMutation(traceId: string, actorId: string, entity: string, entityId: string, operation: 'INSERT' | 'UPDATE' | 'DELETE'): void {
        const envelope = AuditEnvelopeFactory.createMutationEnvelope(traceId, actorId, {
            entity,
            entity_id: entityId,
            operation,
        });
        this.rmqClient.emit('audit_logs_queue', envelope);
    }
}