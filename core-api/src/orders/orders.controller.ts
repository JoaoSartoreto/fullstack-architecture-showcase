import { Controller, Post, Body, Get, Patch, Param, ParseUUIDPipe, Delete } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserEntity } from '../users/entities/user.entity';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    // 1. Creates the cart (DRAFT order)
    @Post('cart')
    @Roles(Role.CUSTOMER)
    async createCart(
        @Body() createOrderDto: CreateOrderDto,
        @CurrentUser() user: UserEntity,
    ) {
        return this.ordersService.createDraft(user.id, createOrderDto);
    }

    // 2. Executes the checkout (Transitions DRAFT to PENDING)
    @Patch(':id/checkout')
    @Roles(Role.CUSTOMER)
    async checkout(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: UserEntity,
    ) {
        return this.ordersService.checkout(id, user.id);
    }

    // Allows STAFF and ADMIN to view all orders in the system
    @Get()
    @Roles(Role.STAFF)
    async findAll() {
        return this.ordersService.findAll();
    }

    // Allows STAFF and ADMIN to update the status of a specific order
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

    // Allows a CUSTOMER to remove a specific item from their active shopping cart (DRAFT)
    @Delete('cart/items/:itemId')
    @Roles(Role.CUSTOMER)
    async removeItemFromCart(
        @Param('itemId', ParseUUIDPipe) itemId: string,
        @CurrentUser() user: UserEntity,
    ) {
        return this.ordersService.removeItemFromDraft(user.id, itemId);
    }
}