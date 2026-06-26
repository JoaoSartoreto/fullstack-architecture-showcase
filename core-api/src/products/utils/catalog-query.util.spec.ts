import { SelectQueryBuilder } from 'typeorm';
import { Order } from '../../common/pagination/enums/order.enum';
import { CatalogPageOptionsDto } from '../dto/catalog-page-options.dto';
import { CatalogItem } from '../entities/catalog-item.entity';
import { ItemType } from '../enums/item-type.enum';
import { applyCatalogFilters } from './catalog-query.util';

describe('CatalogQueryUtil', () => {
    let mockQueryBuilder: Partial<SelectQueryBuilder<CatalogItem>>;

    beforeEach(() => {
        // Create a chainable mock object for the QueryBuilder
        mockQueryBuilder = {
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
        };
    });

    it('should apply standard pagination constraints even when no dynamic filters are provided', () => {
        // Arrange
        const pageOptionsDto = {
            order: Order.ASC,
            page: 1,
            take: 10,
            skip: 0,
        } as CatalogPageOptionsDto;

        // Act
        applyCatalogFilters(mockQueryBuilder as SelectQueryBuilder<CatalogItem>, pageOptionsDto);

        // Assert
        expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
        expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('item.createdAt', Order.ASC);
        expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
        expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should apply the search filter using ILIKE when search parameter is provided', () => {
        // Arrange
        const pageOptionsDto = {
            search: 'laptop',
            order: Order.DESC,
            page: 1,
            take: 10,
            skip: 0,
        } as CatalogPageOptionsDto;

        // Act
        applyCatalogFilters(mockQueryBuilder as SelectQueryBuilder<CatalogItem>, pageOptionsDto);

        // Assert
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('item.name ILIKE :search', { search: '%laptop%' });
    });

    it('should apply the exact type filter when type parameter is provided', () => {
        // Arrange
        const pageOptionsDto = {
            type: ItemType.PHYSICAL_GOODS,
            order: Order.ASC,
            page: 2,
            take: 20,
            skip: 20,
        } as CatalogPageOptionsDto;

        // Act
        applyCatalogFilters(mockQueryBuilder as SelectQueryBuilder<CatalogItem>, pageOptionsDto);

        // Assert
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('item.type = :type', { type: ItemType.PHYSICAL_GOODS });
    });

    it('should apply the minPrice and maxPrice filters when boundaries are provided', () => {
        // Arrange
        const pageOptionsDto = {
            minPrice: 500.5,
            maxPrice: 1500.99,
            order: Order.ASC,
            page: 1,
            take: 10,
            skip: 0,
        } as CatalogPageOptionsDto;

        // Act
        applyCatalogFilters(mockQueryBuilder as SelectQueryBuilder<CatalogItem>, pageOptionsDto);

        // Assert
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('item.price >= :minPrice', { minPrice: 500.5 });
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('item.price <= :maxPrice', { maxPrice: 1500.99 });
    });

    it('should apply all dynamic filters simultaneously when all parameters are present', () => {
        // Arrange
        const pageOptionsDto = {
            search: 'server',
            type: ItemType.SERVICE,
            minPrice: 100,
            maxPrice: 5000,
            order: Order.DESC,
            page: 1,
            take: 10,
            skip: 0,
        } as CatalogPageOptionsDto;

        // Act
        applyCatalogFilters(mockQueryBuilder as SelectQueryBuilder<CatalogItem>, pageOptionsDto);

        // Assert
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(4);
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('item.name ILIKE :search', { search: '%server%' });
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('item.type = :type', { type: ItemType.SERVICE });
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('item.price >= :minPrice', { minPrice: 100 });
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('item.price <= :maxPrice', { maxPrice: 5000 });

        expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('item.createdAt', Order.DESC);
        expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
        expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });
});