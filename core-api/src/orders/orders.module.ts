import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from '../products/products.module';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrderMessageEntity } from './entities/order-message.entity';
import { OrderEntity } from './entities/order.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      OrderItemEntity,
      OrderMessageEntity
    ]),
    ProductsModule,
  ],
  providers: [OrdersService],
  controllers: [OrdersController]
})
export class OrdersModule { }
