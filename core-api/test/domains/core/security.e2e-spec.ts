import { INestApplication } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import request from 'supertest';
import { TestHarness } from '../../helpers/test-harness';

describe('Global Security & Infrastructure (e2e)', () => {
    let app: INestApplication;
    let schedulerRegistry: SchedulerRegistry;

    beforeAll(async () => {
        const harness = TestHarness.getInstance();
        app = await harness.start();
        schedulerRegistry = app.get(SchedulerRegistry);

        // Safely halt background cron jobs to prevent AMQP channel panic during test teardown
        try {
            schedulerRegistry.getCronJob('outboxRelayJob').stop();
            schedulerRegistry.getCronJob('outboxSweepJob').stop();
        } catch (e) {
            // Ignore if jobs are not found
        }
    });

    afterAll(async () => {
        // Allow pending asynchronous operations (like RabbitMQ message acknowledgments or Audit Logs) 
        // to complete gracefully before forcefully shutting down the Docker containers.
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const harness = TestHarness.getInstance();
        await harness.stop();
    });

    it('should enforce rate limiting (ThrottlerGuard) and return 429 Too Many Requests under a spam attack', async () => {
        let rateLimitTriggered = false;

        const totalRequests = 110;
        const targetEndpoint = '/users/me';

        // Execute strictly sequentially. 
        // Firing 100+ concurrent requests directly to the NestJS instance in a test environment 
        // exhausts the TypeORM/RabbitMQ connection pools (default is usually 10 connections), 
        // causing the application to crash with ECONNRESET.
        for (let i = 0; i < totalRequests; i++) {
            const response = await request(app.getHttpServer()).get(targetEndpoint);

            if (response.status === 429) {
                rateLimitTriggered = true;
                break;
            }
        }

        // The Throttler MUST have been activated to defend the application
        expect(rateLimitTriggered).toBe(true);
    });
});