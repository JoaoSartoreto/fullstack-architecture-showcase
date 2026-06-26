import { EntityManager } from 'typeorm';
import { CreateCatalogItemDto } from '../dto/create-catalog-item.dto';
import { PhysicalGoods } from '../entities/physical-goods.entity';
import { Service } from '../entities/service.entity';
import { ItemType } from '../enums/item-type.enum';
import { CatalogItemCreators } from './catalog.factory';

describe('CatalogFactory', () => {
    let entityManager: jest.Mocked<Partial<EntityManager>>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mocks the TypeORM create method
        entityManager = {
            create: jest.fn().mockImplementation((entityClass, dto) => ({
                ...dto,
                constructor: { name: entityClass.name }
            })),
        };
    });

    describe('PHYSICAL_GOODS Creator', () => {
        it('should map the DTO to a PhysicalGoods entity correctly and ignore service fields', () => {
            // Arrange
            const dto: CreateCatalogItemDto = {
                type: ItemType.PHYSICAL_GOODS,
                name: 'Standard Product',
                description: 'A physical item',
                price: 150,
                stockQuantity: 10,
                estimatedDurationHours: 5, // This should be ignored by the physical goods creator
            };

            // Act
            const creator = CatalogItemCreators[ItemType.PHYSICAL_GOODS];
            creator(entityManager as EntityManager, dto);

            // Assert
            expect(entityManager.create).toHaveBeenCalledTimes(1);
            expect(entityManager.create).toHaveBeenCalledWith(PhysicalGoods, {
                name: dto.name,
                description: dto.description,
                price: dto.price,
                stockQuantity: dto.stockQuantity,
                // Ensures estimatedDurationHours is NOT passed to PhysicalGoods
            });
        });
    });

    describe('SERVICE Creator', () => {
        it('should map the DTO to a Service entity correctly and ignore physical fields', () => {
            // Arrange
            const dto: CreateCatalogItemDto = {
                type: ItemType.SERVICE,
                name: 'Standard Service',
                description: 'An intangible service',
                price: 200,
                stockQuantity: 50, // This should be ignored by the service creator
                estimatedDurationHours: 2,
            };

            // Act
            const creator = CatalogItemCreators[ItemType.SERVICE];
            creator(entityManager as EntityManager, dto);

            // Assert
            expect(entityManager.create).toHaveBeenCalledTimes(1);
            expect(entityManager.create).toHaveBeenCalledWith(Service, {
                name: dto.name,
                description: dto.description,
                price: dto.price,
                estimatedDurationHours: dto.estimatedDurationHours,
                // Ensures stockQuantity is NOT passed to Service
            });
        });
    });
});