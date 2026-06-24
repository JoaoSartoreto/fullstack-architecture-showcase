import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CatalogItem } from './entities/catalog-item.entity';
import { ItemType } from './enums/item-type.enum';
import { Order } from '../common/pagination/enums/order.enum';
import { CatalogPageOptionsDto } from './dto/catalog-page-options.dto';
import { EntityManager } from 'typeorm';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: any;

  // Mock do QueryBuilder para o método findAvailable
  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const mockCatalogRepository = {
    manager: {
      create: jest.fn(),
    },
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    exist: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(CatalogItem),
          useValue: mockCatalogRepository,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repository = module.get(getRepositoryToken(CatalogItem));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should successfully create and save a physical good', async () => {
      const dto = {
        name: 'Monitor',
        price: 1000,
        type: ItemType.PHYSICAL_GOODS,
        stockQuantity: 10,
      };

      const mockCreatedEntity = { ...dto, id: '1' };

      repository.manager.create.mockReturnValue(mockCreatedEntity);
      repository.save.mockResolvedValue(mockCreatedEntity);

      const result = await service.create(dto);

      expect(repository.manager.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalledWith(mockCreatedEntity);
      expect(result).toEqual(mockCreatedEntity);
    });

    it('should throw BadRequestException if type is invalid', async () => {
      const dto = {
        name: 'UFO',
        price: 9999,
        type: 'INVALID_TYPE' as ItemType,
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if item does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', { price: 200 })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when adding stock to a SERVICE', async () => {
      const mockServiceItem = { id: '1', type: ItemType.SERVICE, name: 'Installation' };
      repository.findOne.mockResolvedValue(mockServiceItem);

      await expect(
        service.update('1', { stockQuantity: 5 })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when adding estimated hours to PHYSICAL_GOODS', async () => {
      const mockPhysicalItem = { id: '2', type: ItemType.PHYSICAL_GOODS, name: 'Monitor' };
      repository.findOne.mockResolvedValue(mockPhysicalItem);

      await expect(
        service.update('2', { estimatedDurationHours: 10 })
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully update an item if validation passes', async () => {
      const mockPhysicalItem = { id: '3', type: ItemType.PHYSICAL_GOODS, price: 100 };
      repository.findOne.mockResolvedValue(mockPhysicalItem);

      const updatedItem = { ...mockPhysicalItem, price: 150 };
      repository.save.mockResolvedValue(updatedItem);

      const result = await service.update('3', { price: 150 });

      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ price: 150 }));
      expect(result.price).toBe(150);
    });
  });

  describe('findAvailable', () => {
    it('should return available items using the query builder and pagination', async () => {
      // Arrange
      const mockItems = [{ id: '1', name: 'Item 1' }];
      const mockPageOptionsDto = {
        order: Order.ASC,
        page: 1,
        take: 10,
        skip: 0,
      } as CatalogPageOptionsDto;

      const queryBuilderMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockItems, 1]),
      };

      // Inject the mock builder into the repository
      repository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilderMock);

      // Act
      const result = await service.findAvailable(mockPageOptionsDto);

      // Assert
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('item');
      expect(queryBuilderMock.where).toHaveBeenCalledWith('item.is_active = :isActive', { isActive: true });
      expect(queryBuilderMock.getManyAndCount).toHaveBeenCalled();

      expect(result.data).toEqual(mockItems);
      expect(result.meta.itemCount).toBe(1);
    });
  });

  describe('findAll', () => {
    it('should return all items using the query builder and pagination', async () => {
      // Arrange
      const mockItems = [{ id: '1', name: 'Item 1' }, { id: '2', name: 'Item 2' }];
      const mockPageOptionsDto = {
        order: Order.DESC,
        page: 1,
        take: 20,
        skip: 0,
        isActive: false, // Testing the STAFF security filter
      } as CatalogPageOptionsDto;

      const queryBuilderMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockItems, 2]),
      };

      repository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilderMock);

      // Act
      const result = await service.findAll(mockPageOptionsDto);

      // Assert
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('item');
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith('item.is_active = :isActive', { isActive: false });
      expect(queryBuilderMock.orderBy).toHaveBeenCalledWith('item.createdAt', Order.DESC);
      expect(queryBuilderMock.getManyAndCount).toHaveBeenCalled();

      expect(result.data).toEqual(mockItems);
      expect(result.meta.itemCount).toBe(2);
    });
  });

  describe('existsByName', () => {
    it('should return true if an item with the exact name already exists', async () => {
      // Arrange
      const itemName = 'Enterprise Server Rack Rackmount 42U';
      jest.spyOn(repository, 'exist').mockResolvedValue(true);

      // Act
      const result = await service.existsByName(itemName);

      // Assert
      expect(repository.exist).toHaveBeenCalledWith({
        where: { name: itemName },
      });
      expect(result).toBe(true);
    });

    it('should return false if the item does not exist', async () => {
      // Arrange
      const itemName = 'Ghost Product';
      jest.spyOn(repository, 'exist').mockResolvedValue(false);

      // Act
      const result = await service.existsByName(itemName);

      // Assert
      expect(repository.exist).toHaveBeenCalledWith({
        where: { name: itemName },
      });
      expect(result).toBe(false);
    });
  });

  describe('incrementStock', () => {
    let mockManager: Partial<EntityManager>;

    beforeEach(() => {
      // Create a localized mock just for these transaction tests
      mockManager = {
        findOne: jest.fn(),
        save: jest.fn(),
      };
    });

    it('should add quantity back to stockQuantity if item is PHYSICAL_GOODS', async () => {
      const physicalGood = {
        id: 'prod-1',
        type: ItemType.PHYSICAL_GOODS,
        stockQuantity: 10,
      };

      (mockManager.findOne as jest.Mock).mockResolvedValue(physicalGood);
      (mockManager.save as jest.Mock).mockResolvedValue(physicalGood);

      await service.incrementStock(mockManager as EntityManager, 'prod-1', 5);

      expect(physicalGood.stockQuantity).toBe(15);
      expect(mockManager.save).toHaveBeenCalledWith(physicalGood);
    });

    it('should safely ignore stock increment if item is SERVICE', async () => {
      const serviceItem = {
        id: 'serv-1',
        type: ItemType.SERVICE,
      };

      (mockManager.findOne as jest.Mock).mockResolvedValue(serviceItem);

      await service.incrementStock(mockManager as EntityManager, 'serv-1', 5);

      // Assert that save is never called since services don't hold stock
      expect(mockManager.save).not.toHaveBeenCalled();
    });
  });
});