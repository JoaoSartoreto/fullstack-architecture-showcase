import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { rabbitMqClientConfig } from './messaging.config';

@Module({
    imports: [
        ClientsModule.registerAsync([rabbitMqClientConfig]),
    ],
    exports: [ClientsModule],
})
export class MessagingModule { }