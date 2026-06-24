import { EntityManager } from 'typeorm';
import { OrderItemProcessor } from './order-item-processor.util';
import { CatalogItem } from '../../products/entities/catalog-item.entity';
import { OrderEntity } from '../entities/order.entity';
import { OrderItemDto } from '../dto/create-order.dto';
import { OrderStatus } from '../enums/order-status.enum';

describe('OrderItemProcessor', () => {
    let mockManager: Partial<EntityManager>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockManager = {
            findOne: jest.fn(),
            create: jest.fn().mockImplementation((entityClass, dto) => dto), // Returns the plain object for assertion
            save: jest.fn(),
            delete: jest.fn(),
        };
    });

    describe('syncNegotiatedItems', () => {
        it('should act as an inserter when the existing order has no items (empty cart)', async () => {
            const order = { id: 'order-1', status: OrderStatus.DRAFT, items: [] } as unknown as OrderEntity;
            const incomingDto: OrderItemDto[] = [{ productId: 'prod-1', quantity: 2 }];

            (mockManager.findOne as jest.Mock).mockResolvedValue({ id: 'prod-1', price: 100, isActive: true } as CatalogItem);
            (mockManager.create as jest.Mock).mockReturnValue({ id: 'item-1', productId: 'prod-1', quantity: 2 });
            (mockManager.save as jest.Mock).mockResolvedValue(true);

            await OrderItemProcessor.syncNegotiatedItems(mockManager as EntityManager, order, incomingDto);

            expect(mockManager.delete).not.toHaveBeenCalled();
            expect(mockManager.create).toHaveBeenCalledTimes(1);
            expect(mockManager.save).toHaveBeenCalledTimes(1);
        });

        it('should diff correctly: delete obsolete, update existing, and insert new', async () => {
            const order = {
                id: 'order-1',
                items: [
                    { id: 'item-old', productId: 'prod-old', quantity: 1 }, // Will be deleted
                    { id: 'item-keep', productId: 'prod-keep', quantity: 5 } // Will be updated
                ]
            } as unknown as OrderEntity;

            const incomingDto: OrderItemDto[] = [
                { productId: 'prod-keep', quantity: 10 }, // Update
                { productId: 'prod-new', quantity: 3 }    // Insert
            ];

            (mockManager.findOne as jest.Mock).mockResolvedValue({ id: 'prod-new', price: 50, isActive: true } as CatalogItem);
            (mockManager.create as jest.Mock).mockReturnValue({ id: 'item-new', productId: 'prod-new', quantity: 3 });

            await OrderItemProcessor.syncNegotiatedItems(mockManager as EntityManager, order, incomingDto);

            // Assert Delete
            expect(mockManager.delete).toHaveBeenCalledWith(expect.anything(), { id: 'item-old' });

            // Assert Update (save called on existing item reference)
            expect(mockManager.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'item-keep', quantity: 10 }));

            // Assert Insert
            expect(mockManager.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ productId: 'prod-new' }));
        });
    });
});