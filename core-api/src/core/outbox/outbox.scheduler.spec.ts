// src/core/outbox/outbox.scheduler.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { OutboxScheduler } from './outbox.scheduler';
import { OutboxProcessor } from './outbox.processor';

// 1. CRITICAL: Mocking variables must be prefixed with 'mock' and declared at the top level
// This ensures Jest correctly hoists the mock before any module imports it, preventing timer leaks
const mockCronJob = {
    start: jest.fn(),
};

jest.mock('cron', () => ({
    CronJob: jest.fn().mockImplementation(() => mockCronJob),
}));

describe('OutboxScheduler', () => {
    let scheduler: OutboxScheduler;
    let outboxProcessor: jest.Mocked<Partial<OutboxProcessor>>;
    let configService: jest.Mocked<Partial<ConfigService>>;
    let schedulerRegistry: jest.Mocked<Partial<SchedulerRegistry>>;

    beforeEach(async () => {
        jest.clearAllMocks();

        outboxProcessor = {
            processPendingEvents: jest.fn().mockResolvedValue(undefined),
            sweepGarbageCollection: jest.fn().mockResolvedValue(undefined),
        };

        configService = {
            get: jest.fn(),
        };

        schedulerRegistry = {
            addCronJob: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OutboxScheduler,
                { provide: OutboxProcessor, useValue: outboxProcessor },
                { provide: ConfigService, useValue: configService },
                { provide: SchedulerRegistry, useValue: schedulerRegistry },
            ],
        }).compile();

        scheduler = module.get<OutboxScheduler>(OutboxScheduler);
    });

    it('should be defined', () => {
        expect(scheduler).toBeDefined();
    });

    describe('onModuleInit', () => {
        it('should register and start jobs using configurations from ConfigService', () => {
            // Arrange: Provide custom cron expressions from the mocked environment
            (configService.get as jest.Mock).mockImplementation((key: string, defaultValue: any) => {
                if (key === 'OUTBOX_RELAY_CRON') return '*/10 * * * * *';
                if (key === 'OUTBOX_SWEEP_CRON') return '0 5 * * *';
                return defaultValue;
            });

            // Act: Trigger the NestJS lifecycle hook manually
            scheduler.onModuleInit();

            // Assert: ConfigService lookups
            expect(configService.get).toHaveBeenCalledWith('OUTBOX_RELAY_CRON', '*/5 * * * * *');
            expect(configService.get).toHaveBeenCalledWith('OUTBOX_SWEEP_CRON', '0 3 * * *');

            // Assert: Registry inclusion
            expect(schedulerRegistry.addCronJob).toHaveBeenCalledWith('outboxRelayJob', expect.any(Object));
            expect(schedulerRegistry.addCronJob).toHaveBeenCalledWith('outboxSweepJob', expect.any(Object));

            // Assert: Verify that start() was invoked on both instantiated cron jobs
            expect(mockCronJob.start).toHaveBeenCalledTimes(2);
        });

        it('should fallback to default expressions if ConfigService returns undefined', () => {
            // Arrange: Emulate NestJS ConfigService behavior by returning the defaultValue parameter when called
            (configService.get as jest.Mock).mockImplementation((key: string, defaultValue: any) => defaultValue);

            // Act
            scheduler.onModuleInit();

            // Assert: Fallbacks must be requested as the second parameter of configService.get
            expect(configService.get).toHaveBeenCalledWith('OUTBOX_RELAY_CRON', '*/5 * * * * *');
            expect(configService.get).toHaveBeenCalledWith('OUTBOX_SWEEP_CRON', '0 3 * * *');

            expect(schedulerRegistry.addCronJob).toHaveBeenCalledTimes(2);
            expect(mockCronJob.start).toHaveBeenCalledTimes(2);
        });
    });
});