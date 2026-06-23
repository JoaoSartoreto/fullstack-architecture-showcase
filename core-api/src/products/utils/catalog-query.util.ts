import { SelectQueryBuilder } from 'typeorm';
import { CatalogItem } from '../entities/catalog-item.entity';
import { CatalogPageOptionsDto } from '../dto/catalog-page-options.dto';

/**
 * Mutates the provided QueryBuilder to apply shared dynamic filters and pagination constraints.
 * * @param queryBuilder The active TypeORM SelectQueryBuilder instance
 * @param pageOptionsDto The dynamic filtering and pagination parameters
 */
export function applyCatalogFilters(
    queryBuilder: SelectQueryBuilder<CatalogItem>,
    pageOptionsDto: CatalogPageOptionsDto,
): void {
    if (pageOptionsDto.search) {
        queryBuilder.andWhere('item.name ILIKE :search', { search: `%${pageOptionsDto.search}%` });
    }

    if (pageOptionsDto.type) {
        queryBuilder.andWhere('item.type = :type', { type: pageOptionsDto.type });
    }

    if (pageOptionsDto.minPrice !== undefined) {
        queryBuilder.andWhere('item.price >= :minPrice', { minPrice: pageOptionsDto.minPrice });
    }

    if (pageOptionsDto.maxPrice !== undefined) {
        queryBuilder.andWhere('item.price <= :maxPrice', { maxPrice: pageOptionsDto.maxPrice });
    }

    // Standard Pagination
    queryBuilder
        .orderBy('item.createdAt', pageOptionsDto.order)
        .skip(pageOptionsDto.skip)
        .take(pageOptionsDto.take);
}