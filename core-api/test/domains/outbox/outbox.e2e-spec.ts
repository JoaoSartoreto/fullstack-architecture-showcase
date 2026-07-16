import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SchedulerRegistry } from '@nestjs/schedule';
import { TestHarness } from '../../helpers/test-harness';
import { DbCleaner } from '../../helpers/db-cleaner';
import { OutboxProcessor } from '../../../src/core/outbox/outbox.processor';
import { randomUUID } from 'crypto';
import request from 'supertest';

describe('Transactional Outbox Worker & Messaging (e2e)', () => {
    let app: INestApplication;
    let dbCleaner: DbCleaner;
    let dataSource: DataSource;
    let outboxProcessor: OutboxProcessor;
    let schedulerRegistry: SchedulerRegistry;

    beforeAll(async () => {
        const harness = TestHarness.getInstance();
        app = await harness.start();

        dataSource = app.get(DataSource);
        dbCleaner = new DbCleaner(dataSource);
        outboxProcessor = app.get(OutboxProcessor);
        schedulerRegistry = app.get(SchedulerRegistry);

        // Crucial: Stop the background cron jobs so they don't process events 
        // behind our backs and cause race conditions during the assertions.
        try {
            schedulerRegistry.getCronJob('outboxRelayJob').stop();
            schedulerRegistry.getCronJob('outboxSweepJob').stop();
        } catch (e) {
            // Ignore if jobs are not found
        }
    });

    afterEach(async () => {
        await dataSource.query('TRUNCATE TABLE "outbox_events" CASCADE;');
        await dbCleaner.clear();
    });

    afterAll(async () => {
        const harness = TestHarness.getInstance();
        await harness.stop();
    });

    it('should successfully read a pending event, emit it to the real RabbitMQ broker, and mark is_processed = true', async () => {
        const eventId = randomUUID();
        const traceId = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
        const entityId = '123e4567-e89b-12d3-a456-426614174000';

        await dataSource.query(`
            INSERT INTO "outbox_events" ("id", "trace_id", "entity", "entity_id", "operation", "changes", "is_processed", "created_at", "updated_at")
            VALUES ($1, $2, 'orders', $3, 'UPDATE', '{"status": "APPROVED"}', false, NOW(), NOW());
        `, [eventId, traceId, entityId]);

        await outboxProcessor.processPendingEvents();

        const finalEvent = await dataSource.query(`
            SELECT "is_processed", "processed_at" FROM "outbox_events" WHERE "id" = $1;
        `, [eventId]);

        expect(finalEvent[0]).toBeDefined();
        expect(finalEvent[0].is_processed).toBe(true);
        expect(finalEvent[0].processed_at).not.toBeNull();
    });

    it('should execute Garbage Collection and permanently delete events older than retention days', async () => {
        const eventId = randomUUID();
        const traceId = 'f9e8d7c6-b5a4-4c3b-2a1e-1234567890ab';
        const entityId = '98765432-e89b-12d3-a456-426614174000';
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

        await dataSource.query(`
            INSERT INTO "outbox_events" ("id", "trace_id", "entity", "entity_id", "operation", "changes", "is_processed", "created_at", "updated_at", "processed_at")
            VALUES ($1, $2, 'users', $3, 'INSERT', '{}', true, $4, $4, $4);
        `, [eventId, traceId, entityId, oldDate]);

        await outboxProcessor.sweepGarbageCollection();

        const finalEvent = await dataSource.query(`
            SELECT "id" FROM "outbox_events" WHERE "id" = $1;
        `, [eventId]);

        expect(finalEvent.length).toBe(0);
    });

    it('should intercept HTTP requests and automatically create an outbox event via Middleware & Subscriber', async () => {
        const initialCountRes = await dataSource.query('SELECT COUNT(*) FROM "outbox_events"');
        const initialCount = parseInt(initialCountRes[0].count, 10);
        const uniqueEmail = `audit-${Date.now()}@teste.com`;

        const response = await request(app.getHttpServer())
            .post('/users')
            .send({
                fullName: 'Audit Trigger User',
                email: uniqueEmail,
                password: 'strongPassword123!'
            })
            .expect(201);

        const newUserId = response.body.id;

        const finalCountRes = await dataSource.query('SELECT COUNT(*) FROM "outbox_events"');
        const finalCount = parseInt(finalCountRes[0].count, 10);

        expect(finalCount).toBeGreaterThan(initialCount);

        const latestEvent = await dataSource.query(`
            SELECT "operation", "trace_id", "entity", "is_processed" 
            FROM "outbox_events" 
            WHERE "entity_id" = $1 
            ORDER BY "created_at" DESC LIMIT 1
        `, [newUserId]);

        expect(latestEvent.length).toBe(1);
        expect(latestEvent[0].operation).toBe('INSERT'); 
        expect(latestEvent[0].entity).toBeDefined(); 

        expect(latestEvent[0].trace_id).toBeDefined();
        expect(latestEvent[0].trace_id).not.toBeNull();

        expect(latestEvent[0].is_processed).toBe(false);
    });
});