import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { CatalogPageOptionsDto } from './dto/catalog-page-options.dto';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';
import { 
    ApiDocsCreateProduct, 
    ApiDocsFindAll, 
    ApiDocsFindAvailable, 
    ApiDocsProductsController, 
    ApiDocsUpdateProduct 
} from './products.docs';
import { ProductsService } from './products.service';

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
    async findAvailable(@Query() pageOptionsDto: CatalogPageOptionsDto) {
        return this.productsService.findAvailable(pageOptionsDto);
    }

    @Get('all')
    @Roles(Role.STAFF)
    @ApiDocsFindAll()
    async findAll(@Query() pageOptionsDto: CatalogPageOptionsDto) {
        return this.productsService.findAll(pageOptionsDto);
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