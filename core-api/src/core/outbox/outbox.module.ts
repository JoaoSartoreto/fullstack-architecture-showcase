import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { OutboxEntity } from './entities/outbox.entity';
import { MessagingModule } from '../messaging/messaging.module';
import { OutboxRepository } from './outbox.repository';
import { OutboxProcessor } from './outbox.processor';
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