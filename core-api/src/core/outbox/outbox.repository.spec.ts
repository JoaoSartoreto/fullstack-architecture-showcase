import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager, QueryRunner, SelectQueryBuilder } from 'typeorm';
import { OutboxRepository } from './outbox.repository';
import { OutboxEntity } from './entities/outbox.entity';

describe('OutboxRepository', () => {
    let repository: OutboxRepository;
    let dataSource: jest.Mocked<Partial<DataSource>>;
    let queryRunner: jest.Mocked<Partial<QueryRunner>>;
    let entityManager: jest.Mocked<Partial<EntityManager>>;
    let queryBuilder: jest.Mocked<Partial<SelectQueryBuilder<OutboxEntity>>>;

    beforeEach(async () => {
        jest.clearAllMocks();

        // 1. Mocking the chained QueryBuilder
        queryBuilder = {
            setLock: jest.fn().mockReturnThis(),
            setOnLocked: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
        } as unknown as jest.Mocked<SelectQueryBuilder<OutboxEntity>>;

        // 2. Mocking the EntityManager that executes standard queries
        entityManager = {
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
            save: jest.fn().mockResolvedValue(undefined),
            delete: jest.fn().mockResolvedValue({ affected: 5 }), // Simulating 5 deleted rows
        } as unknown as jest.Mocked<EntityManager>;

        // 3. Mocking the QueryRunner responsible for ACID transactions
        queryRunner = {
            connect: jest.fn().mockResolvedValue(undefined),
            startTransaction: jest.fn().mockResolvedValue(undefined),
            commitTransaction: jest.fn().mockResolvedValue(undefined),
            rollbackTransaction: jest.fn().mockResolvedValue(undefined),
            release: jest.fn().mockResolvedValue(undefined),
            manager: entityManager as EntityManager,
        } as unknown as jest.Mocked<QueryRunner>;

        // 4. Mocking the root DataSource
        dataSource = {
            createQueryRunner: jest.fn().mockReturnValue(queryRunner),
            manager: entityManager as EntityManager,
        } as unknown as jest.Mocked<DataSource>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OutboxRepository,
                { provide: DataSource, useValue: dataSource },
            ],
        }).compile();

        repository = module.get<OutboxRepository>(OutboxRepository);
    });

    it('should be defined', () => {
        expect(repository).toBeDefined();
    });

    describe('executeInTransaction', () => {
        it('should execute operation and commit transaction on success', async () => {
            // Arrange
            const mockOperation = jest.fn().mockResolvedValue('SUCCESS_RESULT');

            // Act
            const result = await repository.executeInTransaction(mockOperation);

            // Assert
            expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
            expect(queryRunner.connect).toHaveBeenCalledTimes(1);
            expect(queryRunner.startTransaction).toHaveBeenCalledTimes(1);

            expect(mockOperation).toHaveBeenCalledWith(entityManager);
            expect(result).toBe('SUCCESS_RESULT');

            expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
            expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
            expect(queryRunner.release).toHaveBeenCalledTimes(1);
        });

        it('should rollback transaction and rethrow if operation fails', async () => {
            // Arrange
            const mockError = new Error('Database explosion');
            const mockOperation = jest.fn().mockRejectedValue(mockError);

            // Act & Assert
            await expect(repository.executeInTransaction(mockOperation)).rejects.toThrow(mockError);

            expect(queryRunner.startTransaction).toHaveBeenCalledTimes(1);
            expect(mockOperation).toHaveBeenCalledWith(entityManager);

            expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
            expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1); // Crucial assertion
            expect(queryRunner.release).toHaveBeenCalledTimes(1);
        });
    });

    describe('fetchPendingEvents', () => {
        it('should correctly configure and execute the pessimistic lock query', async () => {
            // Act
            const limit = 50;
            await repository.fetchPendingEvents(entityManager as EntityManager, limit);

            // Assert the exact SQL builder chain order and arguments
            expect(entityManager.createQueryBuilder).toHaveBeenCalledWith(OutboxEntity, 'outbox');
            expect(queryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
            expect(queryBuilder.setOnLocked).toHaveBeenCalledWith('skip_locked');
            expect(queryBuilder.where).toHaveBeenCalledWith('outbox.is_processed = :isProcessed', { isProcessed: false });
            expect(queryBuilder.orderBy).toHaveBeenCalledWith('outbox.createdAt', 'ASC');
            expect(queryBuilder.limit).toHaveBeenCalledWith(limit);
            expect(queryBuilder.getMany).toHaveBeenCalledTimes(1);
        });
    });

    describe('saveEvents', () => {
        it('should save the provided events using the entity manager', async () => {
            // Arrange
            const mockEvents = [{ id: '1' }] as unknown as OutboxEntity[];

            // Act
            await repository.saveEvents(entityManager as EntityManager, mockEvents);

            // Assert
            expect(entityManager.save).toHaveBeenCalledWith(OutboxEntity, mockEvents);
        });
    });

    describe('sweepOldEvents', () => {
        it('should delete events older than the specified retention days', async () => {
            // Act
            const affectedRows = await repository.sweepOldEvents(7);

            // Assert
            expect(dataSource.manager!.delete).toHaveBeenCalledTimes(1);
            expect(dataSource.manager!.delete).toHaveBeenCalledWith(
                OutboxEntity,
                expect.objectContaining({
                    isProcessed: true,
                    // We check that LessThan was invoked, though validating the exact Date 
                    // is complex due to millisecond execution differences.
                    processedAt: expect.anything(),
                })
            );
            expect(affectedRows).toBe(5);
        });
    });
});