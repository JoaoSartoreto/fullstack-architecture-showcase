import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { OutboxSubscriber } from '../outbox/subscribers/outbox.subscriber';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: configService.get<string>('DB_HOST'),
    port: configService.get<number>('DB_PORT'),
    username: configService.get<string>('DB_USER'),
    password: configService.get<string>('DB_PASS'),
    database: configService.get<string>('DB_NAME'),

    autoLoadEntities: true,

    subscribers: [OutboxSubscriber],

    // WARNING: synchronize must be false in production to prevent accidental data loss or schema overrides
    synchronize: configService.get<string>('NODE_ENV') !== 'production',
});