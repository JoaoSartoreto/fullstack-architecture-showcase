import { Column, Entity, Index } from 'typeorm';
import { AbstractBaseEntity } from '../../database/entities/base.entity';

@Entity('outbox_events')
export class OutboxEntity extends AbstractBaseEntity {
    @Column({ name: 'trace_id', type: 'uuid' })
    traceId: string;

    @Column({ name: 'actor_id', type: 'uuid', nullable: true })
    actorId: string | null;

    @Column({ type: 'varchar' })
    entity: string; // e.g., 'orders', 'users'

    @Column({ name: 'entity_id', type: 'uuid' })
    entityId: string;

    @Column({ type: 'varchar' })
    operation: 'INSERT' | 'UPDATE' | 'DELETE';

    @Column({ type: 'jsonb', nullable: true })
    changes: Record<string, any>;

    // Worker Metadata (For the background process)
    @Index()
    @Column({ name: 'is_processed', type: 'boolean', default: false })
    isProcessed: boolean;

    @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
    processedAt: Date | null;
}