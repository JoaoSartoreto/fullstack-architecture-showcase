import { Controller, Post, Get, Body, Patch, Param, ParseUUIDPipe } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';
import { ApiDocsCreateProduct, ApiDocsFindAll, ApiDocsFindAvailable, ApiDocsProductsController, ApiDocsUpdateProduct } from './products.docs';

@ApiDocsProductsController()
@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    // Only STAFF and higher (ADMIN) can add new items to the catalog
    @Post()
    @Roles(Role.STAFF)
    @ApiDocsCreateProduct()
    async create(@Body() createCatalogItemDto: CreateCatalogItemDto) {
        return this.productsService.create(createCatalogItemDto);
    }

    // Any authenticated user (CUSTOMER, STAFF, ADMIN) can view available items
    @Get()
    @Roles(Role.CUSTOMER)
    @ApiDocsFindAvailable()
    async findAvailable() {
        return this.productsService.findAvailable();
    }

    @Get('all')
    @Roles(Role.STAFF)
    @ApiDocsFindAll()
    async findAll() {
        return this.productsService.findAll();
    }

    @Patch(':id')
    @Roles(Role.STAFF)
    @ApiDocsUpdateProduct()
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateCatalogItemDto: UpdateCatalogItemDto,
    ) {
        return this.productsService.update(id, updateCatalogItemDto);
    }
}