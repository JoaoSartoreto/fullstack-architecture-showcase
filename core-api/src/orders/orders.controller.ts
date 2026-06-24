import { Controller, Post, Body, Get, Patch, Param, ParseUUIDPipe, Delete, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserEntity } from '../users/entities/user.entity';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CreateOrderMessageDto } from './dto/create-order-message.dto';
import { ApiDocsApproveNegotiation, ApiDocsCancelOrder, ApiDocsCheckout, ApiDocsCreateCart, ApiDocsFindAllForCustomer, ApiDocsFindAllForStaff, ApiDocsFindOneDetails, ApiDocsFindOrderMessages, ApiDocsOrdersController, ApiDocsRemoveItemFromCart, ApiDocsSendOrderMessage, ApiDocsUpdateNegotiationItems, ApiDocsUpdateStatus } from './orders.docs';
import { OrderPageOptionsDto } from './dto/order-page-options.dto';
import { PageOptionsDto } from '../common/pagination/dto/page-options.dto';

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
    async findAllForStaff(@Query() pageOptionsDto: OrderPageOptionsDto) {
        return this.ordersService.findAllForStaff(pageOptionsDto);
    }

    @Get('my-orders')
    @Roles(Role.CUSTOMER)
    @ApiDocsFindAllForCustomer()
    async findAllForCustomer(
        @CurrentUser() user: UserEntity,
        @Query() pageOptionsDto: OrderPageOptionsDto
    ) {
        return this.ordersService.findAllForCustomer(user.id, pageOptionsDto);
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
        @Query() pageOptionsDto: PageOptionsDto
    ) {
        return this.ordersService.findOrderMessages(id, user.id, user.role, pageOptionsDto);
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

    @Patch(':id/approve')
    @Roles(Role.CUSTOMER)
    @ApiDocsApproveNegotiation()
    async approveByCustomer(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: UserEntity,
    ) {
        return this.ordersService.approveByCustomer(id, user.id);
    }

    @Patch(':id/cancel')
    @Roles(Role.CUSTOMER)
    @ApiDocsCancelOrder()
    async cancelByCustomer(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: UserEntity,
    ) {
        return this.ordersService.cancelByCustomer(id, user.id);
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