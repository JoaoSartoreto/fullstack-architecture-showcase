import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CatalogItem } from './entities/catalog-item.entity';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { ItemType } from './enums/item-type.enum';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';
import { CatalogItemCreators } from './factories/catalog.factory';
import { CatalogValidationUtil } from './utils/catalog-validation.util';
import { PhysicalGoods } from './entities/physical-goods.entity';
import { PageDto } from '../common/pagination/dto/page.dto';
import { PageMetaDto } from '../common/pagination/dto/page-meta.dto';
import { CatalogPageOptionsDto } from './dto/catalog-page-options.dto';
import { applyCatalogFilters } from './utils/catalog-query.util';

@Injectable()
export class ProductsService {

  constructor(
    @InjectRepository(CatalogItem)
    private readonly catalogRepository: Repository<CatalogItem>,
  ) { }

  async create(dto: CreateCatalogItemDto): Promise<CatalogItem> {
    const createLogic = CatalogItemCreators[dto.type];

    CatalogValidationUtil.validateCreatorLogicExists(createLogic, dto.type); // <-- Encapsulated

    const newItem = createLogic(this.catalogRepository.manager, dto);
    return this.catalogRepository.save(newItem);
  }

  async findAvailable(pageOptionsDto: CatalogPageOptionsDto): Promise<PageDto<CatalogItem>> {
    const queryBuilder = this.catalogRepository.createQueryBuilder('item')
      .where('item.is_active = :isActive', { isActive: true })
      .andWhere('(item.type = :serviceType OR (item.type = :physicalType AND item.stock_quantity > 0))', {
        serviceType: ItemType.SERVICE,
        physicalType: ItemType.PHYSICAL_GOODS,
      });

    // Delegate the dynamic filtering pipeline to the pure utility function
    applyCatalogFilters(queryBuilder, pageOptionsDto);

    const [items, itemCount] = await queryBuilder.getManyAndCount();
    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });

    return new PageDto(items, pageMetaDto);
  }

  async findAll(pageOptionsDto: CatalogPageOptionsDto): Promise<PageDto<CatalogItem>> {
    const queryBuilder = this.catalogRepository.createQueryBuilder('item');

    // Apply STAFF-specific security isolation filter
    if (pageOptionsDto.isActive !== undefined) {
      queryBuilder.andWhere('item.is_active = :isActive', { isActive: pageOptionsDto.isActive });
    }

    // Delegate the dynamic filtering pipeline
    applyCatalogFilters(queryBuilder, pageOptionsDto);

    const [items, itemCount] = await queryBuilder.getManyAndCount();
    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });

    return new PageDto(items, pageMetaDto);
  }

  async update(id: string, dto: UpdateCatalogItemDto): Promise<CatalogItem> {
    const item = await this.catalogRepository.findOne({ where: { id } });

    CatalogValidationUtil.validateCatalogItemExists(item, id); // <-- Encapsulated
    CatalogValidationUtil.validateUpdateLogic(item.type, dto);

    return this.catalogRepository.save({ ...item, ...dto });
  }

  async decrementStock(manager: EntityManager, productId: string, quantity: number): Promise<void> {
    const product = await manager.findOne(CatalogItem, { where: { id: productId } });

    CatalogValidationUtil.validateCatalogItemExists(product, productId);
    if (product.type === ItemType.PHYSICAL_GOODS) {
      const physicalGood = product as PhysicalGoods;

      CatalogValidationUtil.validateStockAvailability(
        physicalGood.stockQuantity,
        quantity,
        physicalGood.name
      );

      physicalGood.stockQuantity -= quantity;
      await manager.save(physicalGood);
    }
  }

  async incrementStock(manager: EntityManager, productId: string, quantity: number): Promise<void> {
    const product = await manager.findOne(CatalogItem, { where: { id: productId } });

    CatalogValidationUtil.validateCatalogItemExists(product, productId);

    if (product.type === ItemType.PHYSICAL_GOODS) {
      const physicalGood = product as PhysicalGoods;

      physicalGood.stockQuantity += quantity;
      await manager.save(physicalGood);
    }
  }

  async existsByName(name: string): Promise<boolean> {
    return this.catalogRepository.exist({
      where: { name }
    });
  }
}