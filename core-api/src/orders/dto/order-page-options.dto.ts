import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PageOptionsDto } from '../../common/pagination/dto/page-options.dto';
import { OrderStatus } from '../enums/order-status.enum';

export class OrderPageOptionsDto extends PageOptionsDto {
    @ApiPropertyOptional({ enum: OrderStatus, description: 'Filter by exact order status' })
    @IsEnum(OrderStatus)
    @IsOptional()
    readonly status?: OrderStatus;
}