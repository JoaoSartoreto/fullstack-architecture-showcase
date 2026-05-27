import { Controller, Post, Body, Get, Patch, Param, ParseUUIDPipe, Delete } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserEntity } from '../users/entities/user.entity';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CreateOrderMessageDto } from './dto/create-order-message.dto';

@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Post('cart')
    @Roles(Role.CUSTOMER)
    async createCart(
        @Body() createOrderDto: CreateOrderDto,
        @CurrentUser() user: UserEntity,
    ) {
        return this.ordersService.createDraft(user.id, createOrderDto);
    }

    @Post(':id/messages')
    @Roles(Role.CUSTOMER, Role.STAFF)
    async sendOrderMessage(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() createMessageDto: CreateOrderMessageDto,
        @CurrentUser() user: UserEntity,
    ) {
        return this.ordersService.addMessage(id, user.id, user.role, createMessageDto);
    }

    @Get()
    @Roles(Role.STAFF)
    async findAllForStaff() {
        return this.ordersService.findAllForStaff();
    }

    @Get('my-orders')
    @Roles(Role.CUSTOMER)
    async findAllForCustomer(@CurrentUser() user: UserEntity) {
        return this.ordersService.findAllForCustomer(user.id);
    }

    @Get(':id')
    @Roles(Role.CUSTOMER, Role.STAFF)
    async findOneDetails(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: UserEntity,
    ) {
        return this.ordersService.findOneDetails(id, user.id, user.role);
    }

    @Get(':id/messages')
    @Roles(Role.CUSTOMER, Role.STAFF)
    async findOrderMessages(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: UserEntity,
    ) {
        return this.ordersService.findOrderMessages(id, user.id, user.role);
    }

    @Patch(':id/checkout')
    @Roles(Role.CUSTOMER)
    async checkout(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: UserEntity,
    ) {
        return this.ordersService.checkout(id, user.id);
    }

    @Patch(':id/status')
    @Roles(Role.STAFF)
    async updateStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    ) {
        return this.ordersService.updateStatus(id, updateOrderStatusDto);
    }

    @Patch(':id/items')
    @Roles(Role.STAFF)
    async updateNegotiationItems(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateOrderDto: CreateOrderDto,
    ) {
        return this.ordersService.updateNegotiationItems(id, updateOrderDto);
    }

    @Delete('cart/items/:itemId')
    @Roles(Role.CUSTOMER)
    async removeItemFromCart(
        @Param('itemId', ParseUUIDPipe) itemId: string,
        @CurrentUser() user: UserEntity,
    ) {
        return this.ordersService.removeItemFromDraft(user.id, itemId);
    }
}