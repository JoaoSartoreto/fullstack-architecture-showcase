import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CatalogItem } from '../entities/catalog-item.entity';
import { ItemType } from '../enums/item-type.enum';
import { CatalogValidationUtil } from './catalog-validation.util';

describe('CatalogValidationUtil', () => {
    describe('validateUpdateLogic', () => {
        it('should throw BadRequestException if physical goods receive estimatedDurationHours', () => {
            // Arrange
            const invalidDto = { estimatedDurationHours: 10 };

            // Act & Assert
            expect(() => CatalogValidationUtil.validateUpdateLogic(ItemType.PHYSICAL_GOODS, invalidDto))
                .toThrow(BadRequestException);

            expect(() => CatalogValidationUtil.validateUpdateLogic(ItemType.PHYSICAL_GOODS, invalidDto))
                .toThrow('Cannot assign estimated duration hours to physical goods');
        });

        it('should throw BadRequestException if service receives stockQuantity', () => {
            // Arrange
            const invalidDto = { stockQuantity: 50 };

            // Act & Assert
            expect(() => CatalogValidationUtil.validateUpdateLogic(ItemType.SERVICE, invalidDto))
                .toThrow(BadRequestException);

            expect(() => CatalogValidationUtil.validateUpdateLogic(ItemType.SERVICE, invalidDto))
                .toThrow('Cannot assign stock quantity to a service');
        });

        it('should pass silently for valid physical goods updates', () => {
            // Arrange
            const validDto = { price: 100, stockQuantity: 20, name: 'New Headset' };

            // Act & Assert
            expect(() => CatalogValidationUtil.validateUpdateLogic(ItemType.PHYSICAL_GOODS, validDto))
                .not.toThrow();
        });

        it('should pass silently for valid service updates', () => {
            // Arrange
            const validDto = { price: 200, estimatedDurationHours: 2, description: 'Premium tier' };

            // Act & Assert
            expect(() => CatalogValidationUtil.validateUpdateLogic(ItemType.SERVICE, validDto))
                .not.toThrow();
        });
    });

    describe('validateStockAvailability', () => {
        it('should throw BadRequestException if current stock is less than requested quantity', () => {
            // Act & Assert
            expect(() => CatalogValidationUtil.validateStockAvailability(5, 10, 'Smartphone'))
                .toThrow(BadRequestException);

            expect(() => CatalogValidationUtil.validateStockAvailability(5, 10, 'Smartphone'))
                .toThrow("Insufficient stock for physical good 'Smartphone'. Available: 5, Requested: 10.");
        });

        it('should pass silently if current stock is exactly equal to requested quantity', () => {
            // Act & Assert
            expect(() => CatalogValidationUtil.validateStockAvailability(10, 10, 'Smartphone'))
                .not.toThrow();
        });

        it('should pass silently if current stock is greater than requested quantity', () => {
            // Act & Assert
            expect(() => CatalogValidationUtil.validateStockAvailability(50, 10, 'Smartphone'))
                .not.toThrow();
        });
    });

    describe('validateCatalogItemExists', () => {
        it('should pass silently if catalog item exists', () => {
            const item = { id: 'prod-1' } as CatalogItem;
            expect(() => CatalogValidationUtil.validateCatalogItemExists(item, 'prod-1')).not.toThrow();
        });

        it('should throw NotFoundException if catalog item is null', () => {
            expect(() => CatalogValidationUtil.validateCatalogItemExists(null, 'prod-1')).toThrow(NotFoundException);
        });
    });

    describe('validateCreatorLogicExists', () => {
        it('should pass silently if strategy function is present', () => {
            const mockStrategy = () => { };
            expect(() => CatalogValidationUtil.validateCreatorLogicExists(mockStrategy, 'PHYSICAL_GOODS')).not.toThrow();
        });

        it('should throw BadRequestException if strategy function is missing', () => {
            expect(() => CatalogValidationUtil.validateCreatorLogicExists(null, 'INVALID_TYPE')).toThrow(BadRequestException);
        });
    });
});