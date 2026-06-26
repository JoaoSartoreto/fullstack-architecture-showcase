import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractBaseEntity } from '../../core/database/entities/base.entity';
import { CatalogItem } from '../../products/entities/catalog-item.entity';
import { OrderEntity } from './order.entity';

@Entity('order_items')
export class OrderItemEntity extends AbstractBaseEntity{
    @Column({ name: 'order_id' })
    orderId: string;

    // Relationship back to the Order envelope (Header)
    @ManyToOne(() => OrderEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order: OrderEntity;

    @Column({ name: 'product_id' })
    productId: string;

    // Relationship to the specific polymorphic item from the catalog
    @ManyToOne(() => CatalogItem)
    @JoinColumn({ name: 'product_id' })
    product: CatalogItem;

    @Column({ type: 'int' })
    quantity: number;

    // Historical price protection: records the exact price at the time of purchase
    @Column({ name: 'price_at_purchase', type: 'decimal', precision: 10, scale: 2 })
    priceAtPurchase: number;
}