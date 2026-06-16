import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsProviderAsyncOptions, Transport } from '@nestjs/microservices';

export const RABBITMQ_CLIENT_TOKEN = 'AUDIT_SERVICE_CLIENT';

export const rabbitMqClientConfig: ClientsProviderAsyncOptions = {
    name: RABBITMQ_CLIENT_TOKEN,
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => {
        const user = configService.get<string>('RMQ_USER');
        const pass = configService.get<string>('RMQ_PASS');
        const host = configService.get<string>('RMQ_HOST');
        const port = configService.get<string>('RMQ_PORT');

        return {
            transport: Transport.RMQ,
            options: {
                urls: [`amqp://${user}:${pass}@${host}:${port}`],
                queue: 'audit_logs_queue',
                queueOptions: { durable: true },
                serializer: {
                    serialize(packet) {
                        // Isso garante que apenas o seu envelope seja enviado, sem a casca do NestJS
                        return packet.data;
                    },
                },
            },
        };
    },
};