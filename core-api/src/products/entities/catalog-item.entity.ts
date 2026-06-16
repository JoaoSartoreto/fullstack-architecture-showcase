import { Entity, Column, TableInheritance } from 'typeorm';
import { ItemType } from '../enums/item-type.enum';
import { AbstractBaseEntity } from '../../core/database/entities/base.entity';

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