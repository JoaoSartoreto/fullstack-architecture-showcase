import { ItemType } from '../enums/item-type.enum';

export class CatalogItemResponseDto {
    id: string;
    name: string;
    description?: string;
    price: number;
    isActive: boolean;
    type: ItemType;

    // Physical Goods constraint
    stockQuantity?: number;

    // Service constraint
    estimatedDurationHours?: number;

    createdAt: Date;
    updatedAt: Date;
}