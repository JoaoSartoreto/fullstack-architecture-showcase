import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './core/database/database.module';
import { UsersModule } from './users/users.module';
import { validationProvider } from './core/providers/validation.provider';
import { AuthModule } from './auth/auth.module';
import { globalSerializerInterceptorProvider } from './core/providers/serializer.provider';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { MessagingModule } from './core/messaging/messaging.module';
import { AuditModule } from './core/audit/audit.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { SecurityModule } from './core/security/security.module';
import { OutboxModule } from './core/outbox/outbox.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    SecurityModule,
    AuditModule,
    OutboxModule,
    UsersModule,
    AuthModule,
    ProductsModule,
    OrdersModule,
  ],
  providers: [
    AppService,
    validationProvider,
    globalSerializerInterceptorProvider,
  ],
  controllers: [AppController],
})
export class AppModule { }
