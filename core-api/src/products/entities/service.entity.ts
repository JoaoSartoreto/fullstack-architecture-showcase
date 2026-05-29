import { ChildEntity, Column } from 'typeorm';
import { CatalogItem } from './catalog-item.entity';

@ChildEntity('SERVICE')
export class Service extends CatalogItem {
  @Column({ name: 'estimated_duration_hours', type: 'int', nullable: true })
  estimatedDurationHours: number;
}