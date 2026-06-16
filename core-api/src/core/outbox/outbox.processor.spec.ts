import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { EntityManager } from 'typeorm';
import { of } from 'rxjs';
import { OutboxProcessor } from './outbox.processor';
import { OutboxRepository } from './outbox.repository';
import { RABBITMQ_CLIENT_TOKEN } from '../messaging/messaging.config';
import { OutboxEntity } from './entities/outbox.entity';

describe('OutboxProcessor', () => {
    let processor: OutboxProcessor;
    let outboxRepository: jest.Mocked<Partial<OutboxRepository>>;
    let rmqClient: jest.Mocked<Partial<ClientProxy>>;
    let configService: jest.Mocked<Partial<ConfigService>>;

    beforeEach(async () => {
        jest.clearAllMocks();

        // 1. Mocking the Repository
        outboxRepository = {
            executeInTransaction: jest.fn().mockImplementation(async (callback) => {
                const mockEntityManager = {} as EntityManager;
                return callback(mockEntityManager);
            }),
            fetchPendingEvents: jest.fn(),
            saveEvents: jest.fn().mockResolvedValue(undefined),
            sweepOldEvents: jest.fn().mockResolvedValue(5),
        };

        // 2. Mocking the RabbitMQ Client
        rmqClient = {
            emit: jest.fn().mockReturnValue(of(null)),
        };

        // 3. Mocking the ConfigService to return custom values
        configService = {
            get: jest.fn().mockImplementation((key: string, defaultValue: any) => {
                if (key === 'OUTBOX_RETENTION_DAYS') return 10;
                if (key === 'OUTBOX_MAX_RETRIES') return 2;
                if (key === 'OUTBOX_BATCH_SIZE') return 20; // Custom test value for batch size
                return defaultValue;
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OutboxProcessor,
                { provide: OutboxRepository, useValue: outboxRepository },
                { provide: RABBITMQ_CLIENT_TOKEN, useValue: rmqClient },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        processor = module.get<OutboxProcessor>(OutboxProcessor);

        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    });

    it('should be defined', () => {
        expect(processor).toBeDefined();
    });

    describe('processPendingEvents', () => {
        it('should do nothing if there are no pending events', async () => {
            (outboxRepository.fetchPendingEvents as jest.Mock).mockResolvedValue([]);

            await processor.processPendingEvents();

            expect(outboxRepository.executeInTransaction).toHaveBeenCalledTimes(1);

            // Verify ConfigService was queried
            expect(configService.get).toHaveBeenCalledWith('OUTBOX_BATCH_SIZE', 50);

            // Verify fetchPendingEvents was called with the mocked limit (20) instead of the hardcoded 50
            expect(outboxRepository.fetchPendingEvents).toHaveBeenCalledWith(expect.anything(), 20);
            expect(outboxRepository.fetchPendingEvents).toHaveBeenCalledTimes(1);

            expect(rmqClient.emit).not.toHaveBeenCalled();
            expect(outboxRepository.saveEvents).not.toHaveBeenCalled();
        });

        it('should process, emit, and mark events as processed using configurations', async () => {
            const mockEvent = {
                traceId: 'trace-123',
                actorId: 'actor-456',
                entity: 'users',
                entityId: 'user-789',
                operation: 'INSERT',
                changes: { after: { id: 'user-789' } },
                isProcessed: false,
                processedAt: null,
            } as unknown as OutboxEntity;

            (outboxRepository.fetchPendingEvents as jest.Mock).mockResolvedValue([mockEvent]);

            await processor.processPendingEvents();

            expect(configService.get).toHaveBeenCalledWith('OUTBOX_BATCH_SIZE', 50);
            expect(configService.get).toHaveBeenCalledWith('OUTBOX_MAX_RETRIES', 3);

            expect(outboxRepository.fetchPendingEvents).toHaveBeenCalledWith(expect.anything(), 20);
            expect(outboxRepository.fetchPendingEvents).toHaveBeenCalledTimes(1);

            expect(rmqClient.emit).toHaveBeenCalledTimes(1);

            expect(mockEvent.isProcessed).toBe(true);
            expect(mockEvent.processedAt).toBeInstanceOf(Date);

            expect(outboxRepository.saveEvents).toHaveBeenCalledTimes(1);
        });
    });

    describe('sweepGarbageCollection', () => {
        it('should execute the repository sweep method using value from ConfigService', async () => {
            await processor.sweepGarbageCollection();

            expect(configService.get).toHaveBeenCalledWith('OUTBOX_RETENTION_DAYS', 7);

            expect(outboxRepository.sweepOldEvents).toHaveBeenCalledWith(10);
        });
    });
});