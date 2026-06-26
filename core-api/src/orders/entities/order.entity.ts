import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AbstractBaseEntity } from '../../core/database/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { OrderItemEntity } from './order-item.entity';
import { OrderMessageEntity } from './order-message.entity';

@Entity('orders')
export class OrderEntity extends AbstractBaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'varchar', default: OrderStatus.DRAFT })
  status: OrderStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'fulfillment_details', type: 'text', nullable: true })
  fulfillmentDetails: string | null;

  @Column({ name: 'dispatch_notes', type: 'text', nullable: true })
  dispatchNotes: string | null;

  @OneToMany(() => OrderItemEntity, (item) => item.order)
  items: OrderItemEntity[];

  @OneToMany(() => OrderMessageEntity, (message) => message.order)
  messages: OrderMessageEntity[];
}