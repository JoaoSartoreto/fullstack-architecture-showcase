import { SelectQueryBuilder } from 'typeorm';
import { applyUserFilters } from './user-query.util';
import { UserPageOptionsDto } from '../dto/user-page-options.dto';
import { UserEntity } from '../entities/user.entity';
import { Role } from '../enums/role.enum';
import { Order } from '../../common/pagination/enums/order.enum';

describe('UserQueryUtil', () => {
    let mockQueryBuilder: Partial<SelectQueryBuilder<UserEntity>>;

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
        } as UserPageOptionsDto;

        // Act
        applyUserFilters(mockQueryBuilder as SelectQueryBuilder<UserEntity>, pageOptionsDto);

        // Assert
        expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
        expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('user.createdAt', Order.ASC);
        expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
        expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should apply the email filter using ILIKE when email parameter is provided', () => {
        // Arrange
        const pageOptionsDto = {
            email: 'admin@',
            order: Order.DESC,
            page: 1,
            take: 10,
            skip: 0,
        } as UserPageOptionsDto;

        // Act
        applyUserFilters(mockQueryBuilder as SelectQueryBuilder<UserEntity>, pageOptionsDto);

        // Assert
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.email ILIKE :email', { email: '%admin@%' });
    });

    it('should apply the exact role filter when role parameter is provided', () => {
        // Arrange
        const pageOptionsDto = {
            role: Role.STAFF,
            order: Order.ASC,
            page: 2,
            take: 20,
            skip: 20,
        } as UserPageOptionsDto;

        // Act
        applyUserFilters(mockQueryBuilder as SelectQueryBuilder<UserEntity>, pageOptionsDto);

        // Assert
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.role = :role', { role: Role.STAFF });
    });

    it('should apply all dynamic filters simultaneously when all parameters are present', () => {
        // Arrange
        const pageOptionsDto = {
            email: 'test',
            role: Role.CUSTOMER,
            order: Order.DESC,
            page: 1,
            take: 10,
            skip: 0,
        } as UserPageOptionsDto;

        // Act
        applyUserFilters(mockQueryBuilder as SelectQueryBuilder<UserEntity>, pageOptionsDto);

        // Assert
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2);
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.email ILIKE :email', { email: '%test%' });
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.role = :role', { role: Role.CUSTOMER });

        expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('user.createdAt', Order.DESC);
        expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
        expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });
});