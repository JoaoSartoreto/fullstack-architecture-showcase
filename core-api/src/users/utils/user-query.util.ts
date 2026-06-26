import { SelectQueryBuilder } from 'typeorm';
import { UserPageOptionsDto } from '../dto/user-page-options.dto';
import { UserEntity } from '../entities/user.entity';

/**
 * Mutates the provided QueryBuilder to apply dynamic user filters and pagination constraints.
 * @param queryBuilder The active TypeORM SelectQueryBuilder instance
 * @param pageOptionsDto The dynamic filtering and pagination parameters
 */
export function applyUserFilters(
    queryBuilder: SelectQueryBuilder<UserEntity>,
    pageOptionsDto: UserPageOptionsDto,
): void {
    if (pageOptionsDto.email) {
        queryBuilder.andWhere('user.email ILIKE :email', { email: `%${pageOptionsDto.email}%` });
    }

    if (pageOptionsDto.role) {
        queryBuilder.andWhere('user.role = :role', { role: pageOptionsDto.role });
    }

    // Standard Pagination
    queryBuilder
        .orderBy('user.createdAt', pageOptionsDto.order)
        .skip(pageOptionsDto.skip)
        .take(pageOptionsDto.take);
}