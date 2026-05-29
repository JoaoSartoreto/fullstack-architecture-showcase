// src/orders/entities/order-message.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { OrderEntity } from './order.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('order_messages')
export class OrderMessageEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

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

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}