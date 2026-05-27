import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { CatalogItem } from '../products/entities/catalog-item.entity';
import { OrderStatus } from './enums/order-status.enum';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderValidationUtil } from './utils/order-validation.util';
import { ProductsService } from '../products/products.service';
import { OrderItemProcessor } from '../products/utils/order-item-processor.util';
import { OrderMessageEntity } from './entities/order-message.entity';
import { Role } from '../common/enums/role.enum';
import { CreateOrderMessageDto } from './dto/create-order-message.dto';

@Injectable()
export class OrdersService {
    constructor(
        private readonly dataSource: DataSource,
        @InjectRepository(OrderEntity)
        private readonly orderRepository: Repository<OrderEntity>,
        @InjectRepository(OrderMessageEntity) // <-- NOVO
        private readonly messageRepository: Repository<OrderMessageEntity>,
        private readonly productsService: ProductsService
    ) { }

    async createDraft(userId: string, createOrderDto: CreateOrderDto): Promise<OrderEntity> {
        return this.dataSource.transaction(async (manager) => {
            const orderHeader = manager.create(OrderEntity, {
                userId,
                status: OrderStatus.DRAFT
            });
            const savedOrder = await manager.save(orderHeader);

            // Processing delegated to the Item Processor
            await OrderItemProcessor.processDraftItems(manager, savedOrder.id, createOrderDto.items);

            return savedOrder;
        });
    }

    async checkout(orderId: string, userId: string): Promise<OrderEntity> {
        return this.dataSource.transaction(async (manager) => {
            const order = await manager.findOne(OrderEntity, {
                where: { id: orderId, userId },
                relations: { items: true },
            });

            OrderValidationUtil.validateOrderExists(order, orderId);
            OrderValidationUtil.validateStateTransition(order.status, OrderStatus.PENDING);

            await this.freezeOrderPrices(manager, order.items);

            order.status = OrderStatus.PENDING;
            return manager.save(order);
        });
    }

    async updateNegotiationItems(orderId: string, updateDto: CreateOrderDto): Promise<void> {
        return this.dataSource.transaction(async (manager) => {
            const order = await manager.findOne(OrderEntity, {
                where: { id: orderId },
                relations: { items: true }
            });

            OrderValidationUtil.validateOrderExists(order, orderId);
            OrderValidationUtil.validateNegotiationState(order.status);

            // Complex diffing algorithm delegated to the Item Processor
            await OrderItemProcessor.syncNegotiatedItems(manager, order, updateDto.items);
        });
    }

    async updateStatus(orderId: string, updateDto: UpdateOrderStatusDto): Promise<OrderEntity> {
        return this.dataSource.transaction(async (manager) => {
            const order = await manager.findOne(OrderEntity, {
                where: { id: orderId },
                relations: { items: true }
            });

            OrderValidationUtil.validateOrderExists(order, orderId);
            OrderValidationUtil.validateStateTransition(order.status, updateDto.status);

            if (updateDto.status === OrderStatus.APPROVED) {
                await this.processInventoryDeduction(manager, order.items);
            }

            this.applyNewStatus(order, updateDto);

            return manager.save(order);
        });
    }

    async removeItemFromDraft(userId: string, itemId: string): Promise<void> {
        const item = await this.dataSource.manager.findOne(OrderItemEntity, {
            where: { id: itemId },
            relations: { order: true }
        });

        if (!item) {
            throw new NotFoundException(`Cart item with ID ${itemId} not found.`);
        }

        OrderValidationUtil.validateDraftOwnershipAndState(item.order, userId);

        await this.dataSource.manager.delete(OrderItemEntity, { id: itemId });
    }

    async findAllForStaff(): Promise<OrderEntity[]> {
        return this.orderRepository.find({
            where: {
                status: Not(OrderStatus.DRAFT), // Staff doesn't see private shopping carts
            },
            relations: {
                user: true,
            },
            order: { createdAt: 'DESC' },
        });
    }

    async findAllForCustomer(userId: string): Promise<OrderEntity[]> {
        return this.orderRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    async findOneDetails(orderId: string, userId: string, userRole: Role): Promise<OrderEntity> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: {
                user: true,
                items: { product: true }, // Deeply fetches frozen prices and current product metadata
            },
        });

        OrderValidationUtil.validateOrderExists(order, orderId);
        OrderValidationUtil.validateOrderAccess(order, userId, userRole);

        return order;
    }

    async findOrderMessages(orderId: string, userId: string, userRole: Role): Promise<OrderMessageEntity[]> {
        const order = await this.orderRepository.findOne({ where: { id: orderId } });

        OrderValidationUtil.validateOrderExists(order, orderId);
        OrderValidationUtil.validateOrderAccess(order, userId, userRole);

        return this.messageRepository.find({
            where: { orderId },
            relations: { sender: true }, 
            order: { createdAt: 'DESC' },
        });
    }

    async addMessage(
        orderId: string,
        userId: string,
        userRole: Role,
        createMessageDto: CreateOrderMessageDto
    ): Promise<OrderMessageEntity> {
        const order = await this.orderRepository.findOne({ where: { id: orderId } });

        OrderValidationUtil.validateOrderExists(order, orderId);
        OrderValidationUtil.validateOrderAccess(order, userId, userRole);

        // Business rule: Messages can only be exchanged during negotiation
        if (order.status !== OrderStatus.IN_NEGOTIATION) {
            throw new BadRequestException(
                `Messages can only be sent when the order is in IN_NEGOTIATION status.`
            );
        }

        const message = this.messageRepository.create({
            orderId: order.id,
            senderId: userId,
            content: createMessageDto.content,
        });

        return this.messageRepository.save(message);
    }

    /* --- Private Processing Helpers --- */

    // Isolates the loop and external service call
    private async processInventoryDeduction(manager: EntityManager, items: OrderItemEntity[]): Promise<void> {
        for (const item of items) {
            await this.productsService.decrementStock(manager, item.productId, item.quantity);
        }
    }

    // Encapsulates the specific rule of setting or clearing the rejection reason
    private applyNewStatus(order: OrderEntity, updateDto: UpdateOrderStatusDto): void {
        order.status = updateDto.status;
        order.rejectionReason = updateDto.status === OrderStatus.REJECTED
            ? (updateDto.rejectionReason ?? null)
            : null;
    }

    private async freezeOrderPrices(manager: EntityManager, items: OrderItemEntity[]): Promise<void> {
        for (const item of items) {
            const product = await manager.findOne(CatalogItem, { where: { id: item.productId } });

            OrderValidationUtil.validateProductEligibility(product, item.productId);

            item.priceAtPurchase = product.price;
            await manager.save(item);
        }
    }
}