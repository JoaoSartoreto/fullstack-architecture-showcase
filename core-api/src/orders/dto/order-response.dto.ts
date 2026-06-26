import { OmitType } from "@nestjs/swagger";
import { UserResponseDto } from "../../users/dto/user-response.dto";
import { OrderStatus } from "../enums/order-status.enum";
import { OrderItemResponseDto } from "./order-item-response.dto";
import { OrderMessageResponseDto } from "./order-message-response.dto";

// Base DTO
export class OrderResponseDto {
    id: string;
    userId: string;
    status: OrderStatus;
    rejectionReason: string | null;
    createdAt: Date;
    updatedAt: Date;

    user?: UserResponseDto;
    items?: OrderItemResponseDto[];
    messages?: OrderMessageResponseDto[];
}

// ----------------------------------------------------------------------
// ESPECIFICAÇÕES DE ENDPOINTS (MAPPED TYPES)
// ----------------------------------------------------------------------

// 1. Endpoint: findAllForCustomer (Sem relacionamentos)
export class OrderCustomerListResponseDto extends OmitType(OrderResponseDto, [
    'user',
    'items',
    'messages'
] as const) { }

// 2. Endpoint: findAllForStaff (Retorna apenas com o relacionamento User)
export class OrderStaffListResponseDto extends OmitType(OrderResponseDto, [
    'items',
    'messages'
] as const) { }

// 3. Endpoint: findOneDetails (Retorna com User e Items. Oculta Messages)
export class OrderDetailResponseDto extends OmitType(OrderResponseDto, [
    'messages'
] as const) { }