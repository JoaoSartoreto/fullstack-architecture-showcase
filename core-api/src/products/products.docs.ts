import { applyDecorators } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags
} from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../common/pagination/decorators/api-paginated-response.decorator';
import { CatalogItemResponseDto } from './dto/catalog-item-response.dto';

export function ApiDocsProductsController() {
    return applyDecorators(ApiTags('Catalog & Products'));
}

export function ApiDocsCreateProduct() {
    return applyDecorators(
        ApiBearerAuth('JWT-auth'),
        ApiOperation({ summary: 'Create a new polymorphic catalog item (Staff/Admin only)' }),
        ApiCreatedResponse({ description: 'Catalog item successfully created.', type: CatalogItemResponseDto }),
        ApiBadRequestResponse({ description: 'Invalid item type provided in the payload.' })
    );
}

export function ApiDocsFindAvailable() {
    return applyDecorators(
        ApiBearerAuth('JWT-auth'),
        ApiOperation({ summary: 'List all active catalog items available for purchase' }),
        ApiPaginatedResponse(CatalogItemResponseDto)
    );
}

export function ApiDocsFindAll() {
    return applyDecorators(
        ApiBearerAuth('JWT-auth'),
        ApiOperation({ summary: 'List the entire global catalog including inactive items (Staff/Admin only)' }),
        ApiPaginatedResponse(CatalogItemResponseDto)
    );
}

export function ApiDocsUpdateProduct() {
    return applyDecorators(
        ApiBearerAuth('JWT-auth'),
        ApiOperation({ summary: 'Update metadata of an existing catalog item (Staff/Admin only)' }),
        ApiOkResponse({ description: 'Catalog item successfully updated.', type: CatalogItemResponseDto }),
        ApiNotFoundResponse({ description: 'Catalog item with the specified ID was not found.' }),
        ApiBadRequestResponse({ description: 'Constraint validation failed (e.g., assigning stock to a service or duration to physical goods).' })
    );
}