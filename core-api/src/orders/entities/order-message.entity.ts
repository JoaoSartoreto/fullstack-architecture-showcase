import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { OrderEntity } from './order.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('order_messages')
export class OrderMessageEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'order_id' })
    orderId: string;

    // Relationship back to the main Order envelope
    @ManyToOne(() => OrderEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order: OrderEntity;

    @Column({ name: 'sender_id' })
    senderId: string;

    // Relationship to the user who sent the message (Customer or Staff)
    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'sender_id' })
    sender: UserEntity;

    @Column({ type: 'text' })
    message: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}