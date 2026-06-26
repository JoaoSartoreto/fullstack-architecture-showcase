import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UpdateCatalogItemDto } from '../dto/update-catalog-item.dto';
import { CatalogItem } from '../entities/catalog-item.entity';
import { ItemType } from '../enums/item-type.enum';

export class CatalogValidationUtil {
    static validateUpdateLogic(itemType: string, dto: UpdateCatalogItemDto): void {
        if (itemType === ItemType.PHYSICAL_GOODS && 'estimatedDurationHours' in dto) {
            throw new BadRequestException('Cannot assign estimated duration hours to physical goods');
        }

        if (itemType === ItemType.SERVICE && 'stockQuantity' in dto) {
            throw new BadRequestException('Cannot assign stock quantity to a service');
        }
    }

    static validateStockAvailability(currentStock: number, requestedQuantity: number, productName: string): void {
        if (currentStock < requestedQuantity) {
            throw new BadRequestException(
                `Insufficient stock for physical good '${productName}'. Available: ${currentStock}, Requested: ${requestedQuantity}.`
            );
        }
    }

    static validateCatalogItemExists(item: CatalogItem | null, itemId: string): asserts item is CatalogItem {
        if (!item) {
            throw new NotFoundException(`Catalog item with ID ${itemId} not found.`);
        }
    }

    static validateCreatorLogicExists(createLogic: any, itemType: string): void {
        if (!createLogic) {
            throw new BadRequestException(`Invalid item type: ${itemType}`);
        }
    }
}