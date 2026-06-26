import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractBaseEntity } from '../../core/database/entities/base.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { OrderEntity } from './order.entity';

@Entity('order_messages')
export class OrderMessageEntity extends AbstractBaseEntity{
    @Column({ name: 'order_id', type: 'uuid' })
    orderId: string;

    @ManyToOne(() => OrderEntity, (order) => order.messages, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order: OrderEntity;

    @Column({ name: 'sender_id', type: 'uuid' })
    senderId: string;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'sender_id' })
    sender: UserEntity;

    @Column({ type: 'text' })
    content: string;
}