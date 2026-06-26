import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { OutboxProcessor } from './outbox.processor';

@Injectable()
export class OutboxScheduler implements OnModuleInit {
    private readonly logger = new Logger(OutboxScheduler.name);

    constructor(
        private readonly outboxProcessor: OutboxProcessor,
        private readonly configService: ConfigService,
        private readonly schedulerRegistry: SchedulerRegistry,
    ) { }

    // Executes as soon as the module finishes instantiating all dependencies
    onModuleInit() {
        this.registerRelayJob();
        this.registerSweepJob();
    }

    private registerRelayJob() {
        // Fetch the cron expression from the environment, defaulting to every 5 seconds
        const cronExpression = this.configService.get<string>('OUTBOX_RELAY_CRON', '*/5 * * * * *');

        const job = new CronJob(cronExpression, async () => {
            try {
                await this.outboxProcessor.processPendingEvents();
            } catch (error) {
                this.logger.error('Error during relay cron execution', error);
            }
        });

        // Programmatically register and start the Cron Job
        this.schedulerRegistry.addCronJob('outboxRelayJob', job);
        job.start();
    }

    private registerSweepJob() {
        // Fetch the cron expression, defaulting to 03:00 AM daily
        const cronExpression = this.configService.get<string>('OUTBOX_SWEEP_CRON', '0 3 * * *');

        const job = new CronJob(cronExpression, async () => {
            await this.outboxProcessor.sweepGarbageCollection();
        });

        this.schedulerRegistry.addCronJob('outboxSweepJob', job);
        job.start();
    }
}