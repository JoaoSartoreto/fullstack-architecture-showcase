import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogItem } from './entities/catalog-item.entity';
import { PhysicalGoods } from './entities/physical-goods.entity';
import { Service } from './entities/service.entity';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { ItemType } from './enums/item-type.enum';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';
import { CatalogItemCreators, CatalogUpdateValidators } from './factories/catalog.factory';

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

    if (!item)
      throw new NotFoundException(`Catalog item with ID ${id} not found`);

    // Dynamic validation based on the entity's type
    const validateLogic = CatalogUpdateValidators[item.type];
    if (validateLogic) {
      validateLogic(dto);
    }

    Object.assign(item, dto);
    return this.catalogRepository.save(item);
  }
}