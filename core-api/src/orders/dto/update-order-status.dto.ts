import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { OrderStatus } from '../enums/order-status.enum';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrderStatusDto {
    @ApiProperty({ enum: OrderStatus, description: 'The new status to apply to the order' })
    @IsNotEmpty()
    @IsEnum(OrderStatus)
    status: OrderStatus;

    // The rejection reason is strictly required ONLY if the new status is REJECTED
    @ApiProperty({ required: false, description: 'Reason for rejection. Required if status is REJECTED.' })
    @ValidateIf((o) => o.status === OrderStatus.REJECTED)
    @IsNotEmpty()
    @IsString()
    rejectionReason?: string;

    @ApiProperty({ required: false, description: 'Optional instructions or scheduling details, usually provided when moving to APPROVED.' })
    @IsOptional()
    @IsString()
    fulfillmentDetails?: string;

    @ApiProperty({ required: false, description: 'Optional dispatch tracking or execution schedule provided when moving to PAID.' })
    @IsOptional()
    @IsString()
    dispatchNotes?: string;
}