import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { OrderStatus } from '../enums/order-status.enum';

export class UpdateOrderStatusDto {
    @IsNotEmpty()
    @IsEnum(OrderStatus)
    status: OrderStatus;

    // The rejection reason is strictly required ONLY if the new status is REJECTED
    @ValidateIf((o) => o.status === OrderStatus.REJECTED)
    @IsNotEmpty({ message: 'A rejection reason must be provided when rejecting an order.' })
    @IsString()
    rejectionReason?: string;
}