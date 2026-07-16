import { ChildEntity, Column } from 'typeorm';
import { CatalogItem } from './catalog-item.entity';
import { ItemType } from '../enums/item-type.enum';

@ChildEntity('PHYSICAL_GOODS')
export class PhysicalGoods extends CatalogItem {
  type = ItemType.PHYSICAL_GOODS;

  @Column({ name: 'stock_quantity', type: 'int', default: 0 })
  stockQuantity: number;
}