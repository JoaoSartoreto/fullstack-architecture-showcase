import { ChildEntity, Column } from 'typeorm';
import { CatalogItem } from './catalog-item.entity';

@ChildEntity('PHYSICAL_GOODS')
export class PhysicalGoods extends CatalogItem {
  @Column({ name: 'stock_quantity', type: 'int', default: 0 })
  stockQuantity: number;
}