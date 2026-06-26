import { Column, Entity, TableInheritance } from 'typeorm';
import { AbstractBaseEntity } from '../../core/database/entities/base.entity';
import { ItemType } from '../enums/item-type.enum';

@Entity('catalog_items')
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export class CatalogItem extends AbstractBaseEntity {
  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  type: ItemType;
}