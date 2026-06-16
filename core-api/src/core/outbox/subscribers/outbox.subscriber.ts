import {
    EventSubscriber,
    EntitySubscriberInterface,
    InsertEvent,
    UpdateEvent,
    RemoveEvent,
} from 'typeorm';
import { OutboxEntity } from '../entities/outbox.entity';
import { RequestContext } from '../../context/request-context';
import { v7 as uuidv7 } from 'uuid';

@EventSubscriber()
export class OutboxSubscriber implements EntitySubscriberInterface {

    // Determines if an entity should be tracked
    private shouldTrack(entity: any): boolean {
        // 1. Prevent infinite loops by ignoring the OutboxEntity itself
        if (!entity || entity.constructor.name === 'OutboxEntity') {
            return false;
        }

        // You can add more exclusions here in the future if needed
        return true;
    }

    // Safely extracts the ALS context
    private getContext() {
        const store = RequestContext.getStore();
        return {
            // Generate a fresh UUIDv7 for untracked background processes
            // This prevents index collision and groups isolation per operation
            traceId: store?.traceId || uuidv7(),
            actorId: store?.actorId || null,
        };
    }

    async afterInsert(event: InsertEvent<any>) {
        if (!this.shouldTrack(event.entity)) return;

        const { traceId, actorId } = this.getContext();

        const outbox = new OutboxEntity();
        outbox.traceId = traceId;
        outbox.actorId = actorId;
        outbox.entity = event.metadata.tableName;
        outbox.entityId = event.entity.id;
        outbox.operation = 'INSERT';
        outbox.changes = { after: event.entity };

        // CRITICAL: We MUST use event.manager to share the ACID transaction with the main query
        await event.manager.save(OutboxEntity, outbox);
    }

    async afterUpdate(event: UpdateEvent<any>) {
        if (!this.shouldTrack(event.entity)) return;

        const { traceId, actorId } = this.getContext();

        const outbox = new OutboxEntity();
        outbox.traceId = traceId;
        outbox.actorId = actorId;
        outbox.entity = event.metadata.tableName;
        // Entity might be partial in updates, so we fallback to databaseEntity id
        outbox.entityId = event.entity?.id || event.databaseEntity?.id;
        outbox.operation = 'UPDATE';
        outbox.changes = {
            before: event.databaseEntity, // The state before the update
            after: event.entity,          // The new incoming state
        };

        await event.manager.save(OutboxEntity, outbox);
    }

    async afterRemove(event: RemoveEvent<any>) {
        if (!this.shouldTrack(event.entity) || !event.entityId) return;

        const { traceId, actorId } = this.getContext();

        const outbox = new OutboxEntity();
        outbox.traceId = traceId;
        outbox.actorId = actorId;
        outbox.entity = event.metadata.tableName;
        outbox.entityId = event.entityId;
        outbox.operation = 'DELETE';
        outbox.changes = { before: event.databaseEntity };

        await event.manager.save(OutboxEntity, outbox);
    }
}