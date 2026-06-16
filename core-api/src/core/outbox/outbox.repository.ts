import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, LessThan } from 'typeorm';
import { OutboxEntity } from './entities/outbox.entity';

@Injectable()
export class OutboxRepository {
    constructor(private readonly dataSource: DataSource) { }

    // Encapsulates the boilerplate of creating and managing a secure ACID transaction
    async executeInTransaction<T>(operation: (manager: EntityManager) => Promise<T>): Promise<T> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const result = await operation(queryRunner.manager);
            await queryRunner.commitTransaction();
            return result;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    // Encapsulates the pessimistic locking logic
    async fetchPendingEvents(manager: EntityManager, limit: number): Promise<OutboxEntity[]> {
        return manager
            .createQueryBuilder(OutboxEntity, 'outbox')
            .setLock('pessimistic_write')
            .setOnLocked('skip_locked')
            .where('outbox.is_processed = :isProcessed', { isProcessed: false })
            .orderBy('outbox.createdAt', 'ASC')
            .limit(limit)
            .getMany();
    }

    async saveEvents(manager: EntityManager, events: OutboxEntity[]): Promise<void> {
        await manager.save(OutboxEntity, events);
    }

    async sweepOldEvents(retentionDays: number): Promise<number> {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - retentionDays);

        const result = await this.dataSource.manager.delete(OutboxEntity, {
            isProcessed: true,
            processedAt: LessThan(thresholdDate),
        });

        return result.affected || 0;
    }
}