// src/core/outbox/outbox.processor.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { OutboxRepository } from './outbox.repository';
import { RABBITMQ_CLIENT_TOKEN } from '../messaging/messaging.config';
import { AuditEnvelopeFactory } from '../audit/audit.factory';
import { lastValueFrom, retry } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OutboxProcessor {
    private readonly logger = new Logger(OutboxProcessor.name);

    constructor(
        private readonly outboxRepository: OutboxRepository,
        @Inject(RABBITMQ_CLIENT_TOKEN) private readonly rmqClient: ClientProxy,
        private readonly configService: ConfigService,
    ) { }

    async processPendingEvents(): Promise<void> {
        // We pass a callback to the repository to run entirely within the safe transaction lock
        await this.outboxRepository.executeInTransaction(async (manager) => {
            const batchSize = this.configService.get<number>('OUTBOX_BATCH_SIZE', 50);

            const pendingEvents = await this.outboxRepository.fetchPendingEvents(manager, batchSize);

            if (pendingEvents.length === 0) return;

            this.logger.log(`Processing ${pendingEvents.length} outbox events...`);

            const maxRetries = this.configService.get<number>('OUTBOX_MAX_RETRIES', 3);

            for (const event of pendingEvents) {
                const envelope = AuditEnvelopeFactory.createMutationEnvelope(
                    event.traceId,
                    event.actorId,
                    {
                        entity: event.entity,
                        entity_id: event.entityId,
                        operation: event.operation,
                        changes: event.changes,
                    }
                );

                await lastValueFrom(
                    this.rmqClient.emit('audit_logs_queue', envelope).pipe(retry(maxRetries))
                );

                event.isProcessed = true;
                event.processedAt = new Date();
            }

            await this.outboxRepository.saveEvents(manager, pendingEvents);
        });
    }

    async sweepGarbageCollection(): Promise<void> {
        this.logger.log('Starting outbox sweep (Garbage Collection)...');
        try {
            const retentionDays = this.configService.get<number>('OUTBOX_RETENTION_DAYS', 7);

            const affectedRows = await this.outboxRepository.sweepOldEvents(retentionDays);
            this.logger.log(`Swept ${affectedRows} old outbox events from the database.`);
        } catch (error) {
            this.logger.error('Failed to sweep outbox events', error);
        }
    }
}