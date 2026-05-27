import { EntityManager } from 'typeorm';
import { OrderEntity } from './../../orders/entities/order.entity';
import { OrderItemEntity } from '../../orders/entities/order-item.entity';
import { CatalogItem } from '../../products/entities/catalog-item.entity';
import { OrderItemDto } from '../../orders/dto/create-order.dto';
import { OrderValidationUtil } from '../../orders/utils/order-validation.util';

export class OrderItemProcessor {

    // Processes items when a new DRAFT cart is created
    static async processDraftItems(
        manager: EntityManager,
        orderId: string,
        itemsDto: OrderItemDto[]
    ): Promise<void> {
        for (const itemDto of itemsDto) {
            await this.createNewItemLine(manager, orderId, itemDto);
        }
    }

    // The complete Diffing Algorithm for the IN_NEGOTIATION phase
    static async syncNegotiatedItems(
        manager: EntityManager, 
        order: OrderEntity, 
        incomingItemsDto: OrderItemDto[]
    ): Promise<void> {
        const incomingProductIds = new Set(incomingItemsDto.map(item => item.productId));
        const existingItemsMap = new Map(order.items.map(item => [item.productId, item]));

        await this.removeObsoleteItems(manager, order.items, incomingProductIds);
        await this.upsertIncomingItems(manager, order.id, incomingItemsDto, existingItemsMap);
    }

    /* --- Internal Helpers for the Processor --- */

    private static async removeObsoleteItems(
        manager: EntityManager, 
        existingItems: OrderItemEntity[], 
        incomingProductIds: Set<string>
    ): Promise<void> {
        const itemsToDelete = existingItems.filter(item => !incomingProductIds.has(item.productId));

        for (const item of itemsToDelete) {
            await manager.delete(OrderItemEntity, { id: item.id });
        }
    }

    private static async upsertIncomingItems(
        manager: EntityManager, 
        orderId: string, 
        incomingItemsDto: OrderItemDto[], 
        existingItemsMap: Map<string, OrderItemEntity>
    ): Promise<void> {
        for (const dto of incomingItemsDto) {
            const existingItem = existingItemsMap.get(dto.productId);

            if (existingItem) {
                existingItem.quantity = dto.quantity;
                await manager.save(existingItem);
            } else {
                await this.createNewItemLine(manager, orderId, dto);
            }
        }
    }

    private static async createNewItemLine(manager: EntityManager, orderId: string, itemDto: OrderItemDto): Promise<void> {
        const product = await manager.findOne(CatalogItem, { where: { id: itemDto.productId } });

        OrderValidationUtil.validateProductEligibility(product, itemDto.productId);

        const newItem = manager.create(OrderItemEntity, {
            orderId,
            productId: product.id,
            quantity: itemDto.quantity,
            priceAtPurchase: product.price,
        });

        await manager.save(newItem);
    }
}