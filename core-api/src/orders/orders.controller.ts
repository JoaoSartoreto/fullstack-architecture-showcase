import { Controller, Post, Body, Get, Patch, Param, ParseUUIDPipe, Delete } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserEntity } from '../users/entities/user.entity';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CreateOrderMessageDto } from './dto/create-order-message.dto';
import { ApiDocsCheckout, ApiDocsCreateCart, ApiDocsFindAllForCustomer, ApiDocsFindAllForStaff, ApiDocsFindOneDetails, ApiDocsFindOrderMessages, ApiDocsOrdersController, ApiDocsRemoveItemFromCart, ApiDocsSendOrderMessage, ApiDocsUpdateNegotiationItems, ApiDocsUpdateStatus } from './orders.docs';

@ApiDocsOrdersController()
@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Post('cart')
    @Roles(Role.CUSTOMER)
    @ApiDocsCreateCart()
    async createCart(
        @Body() createOrderDto: CreateOrderDto,
        @CurrentUser() user: UserEntity,
    ) {
        return this.ordersService.createDraft(user.id, createOrderDto);
    }

    @Post(':id/messages')
    @Roles(Role.CUSTOMER, Role.STAFF)
    @ApiDocsSendOrderMessage()
    async sendOrderMessage(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() createMessageDto: CreateOrderMessageDto,
        @CurrentUser() user: UserEntity,
    ) {
        return this.ordersService.addMessage(id, user.id, user.role, createMessageDto);
    }

    @Get()
    @Roles(Role.STAFF)
    @ApiDocsFindAllForStaff()
    async findAllForStaff() {
        return this.ordersService.findAllForStaff();
    }

    @Get('my-orders')
    @Roles(Role.CUSTOMER)
    @ApiDocsFindAllForCustomer()
    async findAllForCustomer(@CurrentUser() user: UserEntity) {
        return this.ordersService.findAllForCustomer(user.id);
    }

    @Get(':id')
    @Roles(Role.CUSTOMER, Role.STAFF)
    @ApiDocsFindOneDetails()
    async findOneDetails(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: UserEntity,
    ) {
        return this.ordersService.findOneDetails(id, user.id, user.role);
    }

    @Get(':id/messages')
    @Roles(Role.CUSTOMER, Role.STAFF)
    @ApiDocsFindOrderMessages()
    async findOrderMessages(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: UserEntity,
    ) {
        return this.ordersService.findOrderMessages(id, user.id, user.role);
    }

    @Patch(':id/checkout')
    @Roles(Role.CUSTOMER)
    @ApiDocsCheckout()
    async checkout(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: UserEntity,
    ) {
        return this.ordersService.checkout(id, user.id);
    }

    @Patch(':id/status')
    @Roles(Role.STAFF)
    @ApiDocsUpdateStatus()
    async updateStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    ) {
        return this.ordersService.updateStatus(id, updateOrderStatusDto);
    }

    @Patch(':id/items')
    @Roles(Role.STAFF)
    @ApiDocsUpdateNegotiationItems()
    async updateNegotiationItems(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateOrderDto: CreateOrderDto,
    ) {
        return this.ordersService.updateNegotiationItems(id, updateOrderDto);
    }

    @Delete('cart/items/:itemId')
    @Roles(Role.CUSTOMER)
    @ApiDocsRemoveItemFromCart()
    async removeItemFromCart(
        @Param('itemId', ParseUUIDPipe) itemId: string,
        @CurrentUser() user: UserEntity,
    ) {
        return this.ordersService.removeItemFromDraft(user.id, itemId);
    }
}