import { Module } from '@nestjs/common';
import { ProductsModule } from '../../../products/products.module';
import { UsersModule } from '../../../users/users.module';
import { SeedService } from './seed.service';

@Module({
  imports: [UsersModule, ProductsModule],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}