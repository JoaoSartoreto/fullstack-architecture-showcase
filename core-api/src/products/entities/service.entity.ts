import { ChildEntity, Column } from 'typeorm';
import { CatalogItem } from './catalog-item.entity';
import { ItemType } from '../enums/item-type.enum';

@ChildEntity('SERVICE')
export class Service extends CatalogItem {
  type = ItemType.SERVICE;

  @Column({ name: 'estimated_duration_hours', type: 'int', nullable: true })
  estimatedDurationHours: number;
}