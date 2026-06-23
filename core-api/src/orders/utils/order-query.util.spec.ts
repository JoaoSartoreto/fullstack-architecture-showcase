import { SelectQueryBuilder } from 'typeorm';
import { applyOrderFilters } from './order-query.util';
import { OrderPageOptionsDto } from '../dto/order-page-options.dto';
import { OrderEntity } from '../entities/order.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { Order } from '../../common/pagination/enums/order.enum';

describe('OrderQueryUtil', () => {
    let mockQueryBuilder: Partial<SelectQueryBuilder<OrderEntity>>;

    beforeEach(() => {
        mockQueryBuilder = {
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
        };
    });

    it('should apply standard pagination constraints when no dynamic filters are provided', () => {
        // Arrange
        const pageOptionsDto = {
            order: Order.ASC,
            page: 1,
            take: 10,
            skip: 0,
        } as OrderPageOptionsDto;

        // Act
        applyOrderFilters(mockQueryBuilder as SelectQueryBuilder<OrderEntity>, pageOptionsDto);

        // Assert
        expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
        expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('order.createdAt', Order.ASC);
        expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
        expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should apply the exact status filter when status parameter is provided', () => {
        // Arrange
        const pageOptionsDto = {
            status: OrderStatus.PENDING,
            order: Order.DESC,
            page: 1,
            take: 10,
            skip: 0,
        } as OrderPageOptionsDto;

        // Act
        applyOrderFilters(mockQueryBuilder as SelectQueryBuilder<OrderEntity>, pageOptionsDto);

        // Assert
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('order.status = :status', { status: OrderStatus.PENDING });

        // Ensure pagination still runs
        expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('order.createdAt', Order.DESC);
    });
});