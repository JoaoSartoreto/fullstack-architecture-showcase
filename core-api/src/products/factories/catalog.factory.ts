import { BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { CatalogItem } from '../entities/catalog-item.entity';
import { PhysicalGoods } from '../entities/physical-goods.entity';
import { Service } from '../entities/service.entity';
import { CreateCatalogItemDto } from '../dto/create-catalog-item.dto';
import { ItemType } from '../enums/item-type.enum';

export const CatalogItemCreators: Record<string, (manager: EntityManager, dto: CreateCatalogItemDto) => CatalogItem> = {
    [ItemType.PHYSICAL_GOODS]: (manager, dto) => manager.create(PhysicalGoods, {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        stockQuantity: dto.stockQuantity,
    }),
    [ItemType.SERVICE]: (manager, dto) => manager.create(Service, {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        estimatedDurationHours: dto.estimatedDurationHours,
    }),
};