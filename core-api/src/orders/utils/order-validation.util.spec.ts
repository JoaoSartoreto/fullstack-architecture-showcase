import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderValidationUtil } from './order-validation.util';
import { OrderStatus } from '../enums/order-status.enum';
import { Role } from '../../users/enums/role.enum';
import { OrderEntity } from '../entities/order.entity';
import { CatalogItem } from '../../products/entities/catalog-item.entity';
import { OrderItemEntity } from '../entities/order-item.entity';

describe('OrderValidationUtil', () => {
    describe('validateOrderExists', () => {
        it('should throw NotFoundException if order is null', () => {
            expect(() => OrderValidationUtil.validateOrderExists(null, 'order-1'))
                .toThrow(NotFoundException);
            expect(() => OrderValidationUtil.validateOrderExists(null, 'order-1'))
                .toThrow('Order with ID order-1 not found.');
        });

        it('should pass silently if order exists', () => {
            const mockOrder = { id: 'order-1' } as OrderEntity;
            expect(() => OrderValidationUtil.validateOrderExists(mockOrder, 'order-1'))
                .not.toThrow();
        });
    });

    describe('validateStateTransition', () => {
        it('should throw BadRequestException if transition is to the same status', () => {
            expect(() => OrderValidationUtil.validateStateTransition(OrderStatus.DRAFT, OrderStatus.DRAFT))
                .toThrow(BadRequestException);
            expect(() => OrderValidationUtil.validateStateTransition(OrderStatus.DRAFT, OrderStatus.DRAFT))
                .toThrow('Order is already in DRAFT status.');
        });

        it('should throw BadRequestException for illegal state transitions', () => {
            // Cannot jump straight from DRAFT to PAID
            expect(() => OrderValidationUtil.validateStateTransition(OrderStatus.DRAFT, OrderStatus.PAID))
                .toThrow(BadRequestException);
            expect(() => OrderValidationUtil.validateStateTransition(OrderStatus.DRAFT, OrderStatus.PAID))
                .toThrow('Invalid state transition. Cannot move from DRAFT to PAID.');
        });

        it('should pass silently for a valid allowed transition', () => {
            expect(() => OrderValidationUtil.validateStateTransition(OrderStatus.DRAFT, OrderStatus.PENDING))
                .not.toThrow();
        });
    });

    describe('validateProductEligibility', () => {
        it('should throw NotFoundException if product is missing', () => {
            expect(() => OrderValidationUtil.validateProductEligibility(null, 'prod-1'))
                .toThrow(NotFoundException);
        });

        it('should throw BadRequestException if product is inactive', () => {
            const inactiveProduct = { id: 'p1', name: 'Legacy Item', isActive: false } as CatalogItem;
            expect(() => OrderValidationUtil.validateProductEligibility(inactiveProduct, 'p1'))
                .toThrow(BadRequestException);
            expect(() => OrderValidationUtil.validateProductEligibility(inactiveProduct, 'p1'))
                .toThrow('Product Legacy Item is currently inactive and cannot be ordered.');
        });

        it('should pass silently if product exists and is active', () => {
            const activeProduct = { id: 'p1', name: 'Good Item', isActive: true } as CatalogItem;
            expect(() => OrderValidationUtil.validateProductEligibility(activeProduct, 'p1'))
                .not.toThrow();
        });
    });

    describe('validateNegotiationState', () => {
        it('should throw BadRequestException if order is not in negotiation phase', () => {
            expect(() => OrderValidationUtil.validateNegotiationState(OrderStatus.PENDING))
                .toThrow(BadRequestException);
        });

        it('should pass silently if order is in IN_NEGOTIATION', () => {
            expect(() => OrderValidationUtil.validateNegotiationState(OrderStatus.IN_NEGOTIATION))
                .not.toThrow();
        });
    });

    describe('validateDraftOwnershipAndState', () => {
        it('should throw NotFoundException if order is completely absent', () => {
            expect(() => OrderValidationUtil.validateDraftOwnershipAndState(null, 'user-1'))
                .toThrow(NotFoundException);
        });

        it('should throw NotFoundException (IDOR Protection) if userId does not match order owner', () => {
            const order = { id: 'o1', userId: 'right-user', status: OrderStatus.DRAFT } as OrderEntity;
            // Trying to access with 'malicious-user'
            expect(() => OrderValidationUtil.validateDraftOwnershipAndState(order, 'malicious-user'))
                .toThrow(NotFoundException);
        });

        it('should throw BadRequestException if order belongs to the user but is no longer a DRAFT', () => {
            const order = { id: 'o1', userId: 'user-1', status: OrderStatus.PENDING } as OrderEntity;
            expect(() => OrderValidationUtil.validateDraftOwnershipAndState(order, 'user-1'))
                .toThrow(BadRequestException);
            expect(() => OrderValidationUtil.validateDraftOwnershipAndState(order, 'user-1'))
                .toThrow('Only DRAFT orders (shopping carts) can be modified by the customer.');
        });

        it('should pass silently if the user owns the order and it is a DRAFT', () => {
            const order = { id: 'o1', userId: 'user-1', status: OrderStatus.DRAFT } as OrderEntity;
            expect(() => OrderValidationUtil.validateDraftOwnershipAndState(order, 'user-1'))
                .not.toThrow();
        });
    });

    describe('validateOrderAccess', () => {
        it('should throw ForbiddenException if a CUSTOMER tries to access someone else order', () => {
            const order = { id: 'o1', userId: 'owner-id' } as OrderEntity;
            expect(() => OrderValidationUtil.validateOrderAccess(order, 'stranger-id', Role.CUSTOMER))
                .toThrow(ForbiddenException);
        });

        it('should allow a CUSTOMER to access their own order', () => {
            const order = { id: 'o1', userId: 'owner-id' } as OrderEntity;
            expect(() => OrderValidationUtil.validateOrderAccess(order, 'owner-id', Role.CUSTOMER))
                .not.toThrow();
        });

        it('should allow an ADMIN to access any order regardless of who owns it', () => {
            const order = { id: 'o1', userId: 'customer-id' } as OrderEntity;
            expect(() => OrderValidationUtil.validateOrderAccess(order, 'admin-id', Role.ADMIN))
                .not.toThrow();
        });
    });

    describe('validateCartNotEmpty', () => {
        it('should pass silently if items exist', () => {
            const items = [{ id: 'item-1' }] as OrderItemEntity[];
            expect(() => OrderValidationUtil.validateCartNotEmpty(items)).not.toThrow();
        });

        it('should throw BadRequestException if items array is empty or null', () => {
            expect(() => OrderValidationUtil.validateCartNotEmpty([])).toThrow(BadRequestException);
            expect(() => OrderValidationUtil.validateCartNotEmpty(null as any)).toThrow(BadRequestException);
        });
    });

    describe('validateOrderItemExists', () => {
        it('should pass silently if item exists', () => {
            const item = { id: 'item-1' } as OrderItemEntity;
            expect(() => OrderValidationUtil.validateOrderItemExists(item, 'item-1')).not.toThrow();
        });

        it('should throw NotFoundException if item is null', () => {
            expect(() => OrderValidationUtil.validateOrderItemExists(null, 'item-1')).toThrow(NotFoundException);
        });
    });

    describe('New Lifecycle Guard Shortcuts', () => {
        it('validateCanSendMessages should throw if not in negotiation', () => {
            expect(() => OrderValidationUtil.validateCanSendMessages(OrderStatus.DRAFT)).toThrow(BadRequestException);
            expect(() => OrderValidationUtil.validateCanSendMessages(OrderStatus.IN_NEGOTIATION)).not.toThrow();
        });

        it('validateCanApproveByCustomer should throw if not in negotiation', () => {
            expect(() => OrderValidationUtil.validateCanApproveByCustomer(OrderStatus.PENDING)).toThrow(BadRequestException);
            expect(() => OrderValidationUtil.validateCanApproveByCustomer(OrderStatus.IN_NEGOTIATION)).not.toThrow();
        });

        it('validateCanCancelByCustomer should throw if already processed or draft', () => {
            expect(() => OrderValidationUtil.validateCanCancelByCustomer(OrderStatus.APPROVED)).toThrow(BadRequestException);
            expect(() => OrderValidationUtil.validateCanCancelByCustomer(OrderStatus.PENDING)).not.toThrow();
            expect(() => OrderValidationUtil.validateCanCancelByCustomer(OrderStatus.IN_NEGOTIATION)).not.toThrow();
        });
    });
});