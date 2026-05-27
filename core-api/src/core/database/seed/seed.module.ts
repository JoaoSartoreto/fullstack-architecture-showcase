import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { UsersModule } from '../../../users/users.module';
import { ProductsModule } from '../../../products/products.module';

@Module({
  imports: [UsersModule, ProductsModule],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}