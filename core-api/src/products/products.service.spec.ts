import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CatalogItem } from './entities/catalog-item.entity';
import { ItemType } from './enums/item-type.enum';

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
    it('should return available items using the query builder', async () => {
      const mockResult = [{ id: '1', name: 'Monitor' }];
      mockQueryBuilder.getMany.mockResolvedValue(mockResult);

      const result = await service.findAvailable();

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('item');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('item.is_active = :isActive', { isActive: true });
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();

      expect(result).toEqual(mockResult);
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
});