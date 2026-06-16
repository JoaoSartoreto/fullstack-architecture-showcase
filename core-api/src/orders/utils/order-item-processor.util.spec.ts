import { EntityManager } from 'typeorm';
import { OrderItemProcessor } from './order-item-processor.util';
import { OrderValidationUtil } from './order-validation.util';
import { OrderItemEntity } from '../entities/order-item.entity';
import { CatalogItem } from '../../products/entities/catalog-item.entity';
import { OrderEntity } from '../entities/order.entity';
import { OrderItemDto } from '../dto/create-order.dto';

// Mocks the validation utility so we don't trigger real business rule exceptions here
jest.mock('./order-validation.util', () => ({
    OrderValidationUtil: {
        validateProductEligibility: jest.fn(),
    },
}));

describe('OrderItemProcessor', () => {
    let manager: jest.Mocked<Partial<EntityManager>>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mocks all TypeORM EntityManager methods used in the processor
        manager = {
            findOne: jest.fn(),
            create: jest.fn().mockImplementation((entityClass, dto) => dto), // Returns the plain object for assertion
            save: jest.fn(),
            delete: jest.fn(),
        };
    });

    describe('processDraftItems', () => {
        it('should create new item lines for all incoming DTOs in a draft order', async () => {
            // Arrange
            const orderId = 'order-123';
            const itemsDto: OrderItemDto[] = [
                { productId: 'prod-1', quantity: 2 },
                { productId: 'prod-2', quantity: 3 },
            ];

            const mockProduct1 = { id: 'prod-1', price: 100 } as CatalogItem;
            const mockProduct2 = { id: 'prod-2', price: 200 } as CatalogItem;

            (manager.findOne as jest.Mock)
                .mockResolvedValueOnce(mockProduct1)
                .mockResolvedValueOnce(mockProduct2);

            // Act
            await OrderItemProcessor.processDraftItems(manager as EntityManager, orderId, itemsDto);

            // Assert
            expect(manager.findOne).toHaveBeenCalledTimes(2);
            expect(OrderValidationUtil.validateProductEligibility).toHaveBeenCalledTimes(2);

            // Checks if TypeORM create was called with correct mapped data
            expect(manager.create).toHaveBeenCalledTimes(2);
            expect(manager.create).toHaveBeenNthCalledWith(1, OrderItemEntity, {
                orderId,
                productId: 'prod-1',
                quantity: 2,
                priceAtPurchase: 100,
            });

            expect(manager.save).toHaveBeenCalledTimes(2);
        });
    });

    describe('syncNegotiatedItems', () => {
        it('should execute the diffing algorithm: remove obsolete, update existing, and create new items', async () => {
            // Arrange
            const orderId = 'order-123';

            const existingItemToRemove = { id: 'item-old', productId: 'prod-old', quantity: 1 } as OrderItemEntity;
            const existingItemToUpdate = { id: 'item-keep', productId: 'prod-keep', quantity: 1 } as OrderItemEntity;

            const order = {
                id: orderId,
                items: [existingItemToRemove, existingItemToUpdate],
            } as OrderEntity;

            const incomingItemsDto: OrderItemDto[] = [
                { productId: 'prod-keep', quantity: 5 }, // Should trigger UPDATE
                { productId: 'prod-new', quantity: 2 },  // Should trigger CREATE
            ];

            const mockNewProduct = { id: 'prod-new', price: 300 } as CatalogItem;
            (manager.findOne as jest.Mock).mockResolvedValue(mockNewProduct);

            // Act
            await OrderItemProcessor.syncNegotiatedItems(manager as EntityManager, order, incomingItemsDto);

            // Assert 1: Obsolete item removal
            expect(manager.delete).toHaveBeenCalledTimes(1);
            expect(manager.delete).toHaveBeenCalledWith(OrderItemEntity, { id: 'item-old' });

            // Assert 2: Existing item update
            expect(existingItemToUpdate.quantity).toBe(5); // The object reference should be mutated
            expect(manager.save).toHaveBeenCalledWith(existingItemToUpdate);

            // Assert 3: New item creation
            expect(manager.findOne).toHaveBeenCalledWith(CatalogItem, { where: { id: 'prod-new' } });
            expect(manager.create).toHaveBeenCalledWith(OrderItemEntity, {
                orderId,
                productId: 'prod-new',
                quantity: 2,
                priceAtPurchase: 300,
            });
            // Total saves = 1 update + 1 create
            expect(manager.save).toHaveBeenCalledTimes(2);
        });
    });
});