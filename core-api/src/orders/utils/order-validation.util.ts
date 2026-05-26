// src/orders/utils/order-validation.util.ts
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderEntity } from '../entities/order.entity';
import { CatalogItem } from '../../products/entities/catalog-item.entity';
import { OrderStatus } from '../enums/order-status.enum';

export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.DRAFT]: [OrderStatus.PENDING],
    [OrderStatus.PENDING]: [OrderStatus.IN_NEGOTIATION, OrderStatus.APPROVED, OrderStatus.REJECTED],
    [OrderStatus.IN_NEGOTIATION]: [OrderStatus.APPROVED, OrderStatus.REJECTED],
    [OrderStatus.APPROVED]: [OrderStatus.PAID],
    [OrderStatus.PAID]: [OrderStatus.DELIVERED],
    [OrderStatus.REJECTED]: [],
    [OrderStatus.DELIVERED]: [],
};

export class OrderValidationUtil {

    static validateOrderExists(order: OrderEntity | null, orderId: string): asserts order is OrderEntity {
        if (!order) {
            throw new NotFoundException(`Order with ID ${orderId} not found.`);
        }
    }

    static validateStateTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
        if (currentStatus === newStatus) {
            throw new BadRequestException(`Order is already in ${currentStatus} status.`);
        }

        const allowedNextStates = ALLOWED_STATUS_TRANSITIONS[currentStatus];
        if (!allowedNextStates || !allowedNextStates.includes(newStatus)) {
            throw new BadRequestException(
                `Invalid state transition. Cannot move from ${currentStatus} to ${newStatus}.`
            );
        }
    }

    static validateProductEligibility(product: CatalogItem | null, requestedId: string): asserts product is CatalogItem {
        if (!product) {
            throw new NotFoundException(`Product with ID ${requestedId} not found.`);
        }
        if (!product.isActive) {
            throw new BadRequestException(`Product ${product.name} is currently inactive and cannot be ordered.`);
        }
    }

    static validateNegotiationState(currentStatus: OrderStatus): void {
        if (currentStatus !== OrderStatus.IN_NEGOTIATION) {
            throw new BadRequestException(
                `Items can only be modified when the order is in IN_NEGOTIATION state. Current state: ${currentStatus}`
            );
        }
    }

    static validateDraftOwnershipAndState(order: OrderEntity | null, userId: string): asserts order is OrderEntity {
        if (!order) {
            throw new NotFoundException(`Order not found.`);
        }

        // IDOR Protection: Ensures the current user owns this cart
        if (order.userId !== userId) {
            throw new NotFoundException(`Order not found.`); // Returning 404 instead of 403 hides the existence of other users' orders
        }

        if (order.status !== OrderStatus.DRAFT) {
            throw new BadRequestException(`Only DRAFT orders (shopping carts) can be modified by the customer.`);
        }
    }
}