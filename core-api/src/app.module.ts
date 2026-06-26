import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './core/audit/audit.module';
import { DatabaseModule } from './core/database/database.module';
import { OutboxModule } from './core/outbox/outbox.module';
import { globalSerializerInterceptorProvider } from './core/providers/serializer.provider';
import { validationProvider } from './core/providers/validation.provider';
import { SecurityModule } from './core/security/security.module';
import { OrdersModule } from './orders/orders.module';
import { ProductsModule } from './products/products.module';
import { UsersModule } from './users/users.module';

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
