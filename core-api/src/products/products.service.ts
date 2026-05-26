import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CatalogItem } from './entities/catalog-item.entity';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { ItemType } from './enums/item-type.enum';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';
import { CatalogItemCreators } from './factories/catalog.factory';
import { CatalogValidationUtil } from './utils/catalog-validation.util';
import { PhysicalGoods } from './entities/physical-goods.entity';

@Injectable()
export class ProductsService {

  constructor(
    @InjectRepository(CatalogItem)
    private readonly catalogRepository: Repository<CatalogItem>,
  ) { }

  async create(dto: CreateCatalogItemDto): Promise<CatalogItem> {
    // Look up the specific creator function based on the provided type
    const createLogic = CatalogItemCreators[dto.type]

    if (!createLogic)
      throw new BadRequestException(`Invalid item type: ${dto.type}`);

    // Execute the creator function and save to the database
    const newItem = createLogic(this.catalogRepository.manager, dto);
    return this.catalogRepository.save(newItem);
  }

  async findAvailable(): Promise<CatalogItem[]> {
    return this.catalogRepository
      .createQueryBuilder('item')
      .where('item.is_active = :isActive', { isActive: true })
      // Logic: "Return if it's a Service OR (it's Physical Goods AND has stock)"
      .andWhere('(item.type = :serviceType OR (item.type = :physicalType AND item.stock_quantity > 0))', {
        serviceType: ItemType.SERVICE,
        physicalType: ItemType.PHYSICAL_GOODS,
      })
      .getMany();
  }

  async findAll(): Promise<CatalogItem[]> {
    return this.catalogRepository.find();
  }

  async update(id: string, dto: UpdateCatalogItemDto): Promise<CatalogItem> {
    const item = await this.catalogRepository.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException(`Catalog item with ID ${id} not found`);
    }

    CatalogValidationUtil.validateUpdateLogic(item.type, dto);

    // Cleaner object merging
    return this.catalogRepository.save({ ...item, ...dto });
  }

  async decrementStock(manager: EntityManager, productId: string, quantity: number): Promise<void> {
    const product = await manager.findOne(CatalogItem, { where: { id: productId } });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

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
}