// src/orders/orders.docs.ts
import { applyDecorators } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiCreatedResponse,
    ApiOkResponse,
    ApiBadRequestResponse,
    ApiNotFoundResponse,
    ApiForbiddenResponse,
    ApiTags
} from '@nestjs/swagger';
import { 
    OrderCustomerListResponseDto, 
    OrderDetailResponseDto, 
    OrderResponseDto, 
    OrderStaffListResponseDto 
} from './dto/order-response.dto';
import { OrderMessageResponseDto } from './dto/order-message-response.dto';

export function ApiDocsOrdersController() {
    return applyDecorators(ApiTags('Orders & Negotiation'));
}

export function ApiDocsCreateCart() {
    return applyDecorators(
        ApiBearerAuth('JWT-auth'),
        ApiOperation({ summary: 'Create a new DRAFT order (Shopping Cart) or push items to it' }),
        ApiCreatedResponse({ description: 'Cart created or updated successfully.', type: OrderResponseDto }),
        ApiBadRequestResponse({ description: 'Product is inactive and cannot be ordered.' }),
        ApiNotFoundResponse({ description: 'Requested product ID not found in catalog.' })
    );
}

export function ApiDocsSendOrderMessage() {
    return applyDecorators(
        ApiBearerAuth('JWT-auth'),
        ApiOperation({ summary: 'Append a message to the negotiation timeline' }),
        ApiCreatedResponse({ description: 'Message sent successfully.', type: OrderMessageResponseDto }),
        ApiBadRequestResponse({ description: 'Order is not in IN_NEGOTIATION status.' }),
        ApiForbiddenResponse({ description: 'User does not have permission to access this order.' }),
        ApiNotFoundResponse({ description: 'Order ID not found.' })
    );
}

export function ApiDocsFindAllForStaff() {
    return applyDecorators(
        ApiBearerAuth('JWT-auth'),
        ApiOperation({ summary: 'List all active system orders (Excludes customer drafts)' }),
        ApiOkResponse({ description: 'Orders retrieved successfully.', type: [OrderStaffListResponseDto] })
    );
}

export function ApiDocsFindAllForCustomer() {
    return applyDecorators(
        ApiBearerAuth('JWT-auth'),
        ApiOperation({ summary: 'List all orders belonging to the current customer' }),
        ApiOkResponse({ description: 'Customer orders retrieved successfully.', type: [OrderCustomerListResponseDto] })
    );
}

export function ApiDocsFindOneDetails() {
    return applyDecorators(
        ApiBearerAuth('JWT-auth'),
        ApiOperation({ summary: 'Get full order details including items and prices' }),
        ApiOkResponse({ description: 'Order details retrieved successfully.', type: OrderDetailResponseDto }),
        ApiForbiddenResponse({ description: 'User does not have permission to access this order.' }),
        ApiNotFoundResponse({ description: 'Order ID not found.' })
    );
}

export function ApiDocsFindOrderMessages() {
    return applyDecorators(
        ApiBearerAuth('JWT-auth'),
        ApiOperation({ summary: 'Get chronologically sorted negotiation chat history' }),
        ApiOkResponse({ description: 'Messages retrieved successfully.', type: [OrderMessageResponseDto] }),
        ApiForbiddenResponse({ description: 'User does not have permission to access this order.' }),
        ApiNotFoundResponse({ description: 'Order ID not found.' })
    );
}

export function ApiDocsCheckout() {
    return applyDecorators(
        ApiBearerAuth('JWT-auth'),
        ApiOperation({ summary: 'Submit cart for approval, freezing prices chronologically' }),
        ApiOkResponse({ description: 'Order transitioned to PENDING successfully.', type: OrderResponseDto }),
        ApiBadRequestResponse({ description: 'Invalid state transition or product is inactive.' }),
        ApiNotFoundResponse({ description: 'Order or Product ID not found.' })
    );
}

export function ApiDocsUpdateStatus() {
    return applyDecorators(
        ApiBearerAuth('JWT-auth'),
        ApiOperation({ summary: 'Advance the machine state (e.g., APPROVED triggers inventory deduction)' }),
        ApiOkResponse({ description: 'Order status updated successfully.', type: OrderResponseDto }),
        ApiBadRequestResponse({ description: 'Invalid state transition, or insufficient stock available.' }),
        ApiNotFoundResponse({ description: 'Order or Product ID not found.' })
    );
}

export function ApiDocsUpdateNegotiationItems() {
    return applyDecorators(
        ApiBearerAuth('JWT-auth'),
        ApiOperation({ summary: 'Sync order lines via Diffing Algorithm during negotiation phase' }),
        ApiOkResponse({ description: 'Order items synced successfully.' }),
        ApiBadRequestResponse({ description: 'Order is not in negotiation phase, or product inactive.' }),
        ApiNotFoundResponse({ description: 'Order or Product ID not found.' })
    );
}

export function ApiDocsRemoveItemFromCart() {
    return applyDecorators(
        ApiBearerAuth('JWT-auth'),
        ApiOperation({ summary: 'Remove a specific item from the active cart' }),
        ApiOkResponse({ description: 'Item removed successfully.' }),
        ApiBadRequestResponse({ description: 'Order is not in DRAFT status.' }),
        ApiNotFoundResponse({ description: 'Cart item or Order not found.' })
    );
}