// src/core/outbox/outbox.subscriber.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, InsertEvent, UpdateEvent, EntityManager } from 'typeorm';
import { OutboxSubscriber } from './outbox.subscriber';
import { OutboxEntity } from '../entities/outbox.entity';
import { RequestContext } from '../../context/request-context';

describe('OutboxSubscriber', () => {
    let subscriber: OutboxSubscriber;
    let dataSource: jest.Mocked<Partial<DataSource>>;
    let entityManager: jest.Mocked<Partial<EntityManager>>;

    beforeEach(async () => {
        jest.clearAllMocks();

        // 1. Mocking the EntityManager responsible for saving the outbox event
        entityManager = {
            save: jest.fn().mockResolvedValue(undefined),
        } as unknown as jest.Mocked<EntityManager>;

        // 2. Mocking the DataSource
        dataSource = {
            subscribers: [],
        } as unknown as jest.Mocked<DataSource>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OutboxSubscriber,
                { provide: DataSource, useValue: dataSource },
            ],
        }).compile();

        subscriber = module.get<OutboxSubscriber>(OutboxSubscriber);
    });

    afterEach(() => {
        // Clear the AsyncLocalStorage context after each test to prevent cross-test contamination
        jest.restoreAllMocks();
    });

    it('should be defined', () => {
        expect(subscriber).toBeDefined();
    });

    describe('afterInsert', () => {
        it('should generate an outbox event and save it within the transaction', async () => {
            // Arrange
            const mockEntity = { id: 'entity-123', name: 'Product A' };
            const mockEvent = {
                metadata: { tableName: 'products' },
                entity: mockEntity,
                manager: entityManager,
            } as unknown as InsertEvent<any>;

            // Mock the ALS RequestContext to simulate a request with a Trace ID
            jest.spyOn(RequestContext, 'getStore').mockReturnValue({
                traceId: 'trace-777',
                actorId: 'actor-999',
            });

            // Act
            await subscriber.afterInsert(mockEvent);

            // Assert
            expect(entityManager.save).toHaveBeenCalledTimes(1);
            expect(entityManager.save).toHaveBeenCalledWith(
                OutboxEntity,
                expect.objectContaining({
                    traceId: 'trace-777',
                    actorId: 'actor-999',
                    entity: 'products',
                    entityId: 'entity-123',
                    operation: 'INSERT',
                    changes: { after: mockEntity },
                })
            );
        });
    });

    describe('afterUpdate', () => {
        it('should NOT create an outbox event if entity or databaseEntity is missing', async () => {
            // Arrange
            const mockEvent = {
                manager: entityManager,
                // Missing entity and databaseEntity intentionally
            } as unknown as UpdateEvent<any>;

            // Act
            await subscriber.afterUpdate(mockEvent);

            // Assert
            expect(entityManager.save).not.toHaveBeenCalled();
        });

        it('should generate an outbox event with before and after state', async () => {
            // Arrange
            const mockEntity = { id: 'entity-123', price: 200 };         // New state
            const mockDatabaseEntity = { id: 'entity-123', price: 100 }; // Old state

            const mockEvent = {
                metadata: { tableName: 'orders' },
                entity: mockEntity,
                databaseEntity: mockDatabaseEntity,
                manager: entityManager,
            } as unknown as UpdateEvent<any>;

            // Mock the ALS context
            jest.spyOn(RequestContext, 'getStore').mockReturnValue({
                traceId: 'trace-888',
                actorId: 'actor-111',
            });

            // Act
            await subscriber.afterUpdate(mockEvent);

            // Assert
            expect(entityManager.save).toHaveBeenCalledTimes(1);
            expect(entityManager.save).toHaveBeenCalledWith(
                OutboxEntity,
                expect.objectContaining({
                    traceId: 'trace-888',
                    actorId: 'actor-111',
                    entity: 'orders',
                    entityId: 'entity-123',
                    operation: 'UPDATE',
                    changes: {
                        before: mockDatabaseEntity,
                        after: mockEntity
                    },
                })
            );
        });
    });
});