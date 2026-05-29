import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './core/database/database.module';
import { UsersModule } from './users/users.module';
import { validationProvider } from './common/providers/validation.provider';
import { AuthModule } from './auth/auth.module';
import { globalSerializerInterceptorProvider } from './common/providers/serializer.provider';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
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
