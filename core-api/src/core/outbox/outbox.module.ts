import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagingModule } from '../messaging/messaging.module';
import { OutboxEntity } from './entities/outbox.entity';
import { OutboxProcessor } from './outbox.processor';
import { OutboxRepository } from './outbox.repository';
import { OutboxScheduler } from './outbox.scheduler';

@Module({
    imports: [
        TypeOrmModule.forFeature([OutboxEntity]),
        MessagingModule,
        ScheduleModule.forRoot(),
    ],
    providers: [
        OutboxRepository,
        OutboxProcessor,
        OutboxScheduler,
    ],
})
export class OutboxModule { }