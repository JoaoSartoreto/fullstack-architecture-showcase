import { SelectQueryBuilder } from 'typeorm';
import { OrderPageOptionsDto } from '../dto/order-page-options.dto';
import { OrderEntity } from '../entities/order.entity';

/**
 * Mutates the provided QueryBuilder to apply dynamic order filters and pagination constraints.
 */
export function applyOrderFilters(
    queryBuilder: SelectQueryBuilder<OrderEntity>,
    pageOptionsDto: OrderPageOptionsDto,
): void {
    if (pageOptionsDto.status) {
        queryBuilder.andWhere('order.status = :status', { status: pageOptionsDto.status });
    }

    queryBuilder
        .orderBy('order.createdAt', pageOptionsDto.order)
        .skip(pageOptionsDto.skip)
        .take(pageOptionsDto.take);
}