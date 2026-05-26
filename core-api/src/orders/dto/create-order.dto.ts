import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt, IsNotEmpty, IsUUID, Min, ValidateNested } from 'class-validator';

// 1. Define the shape of a single item in the cart
export class OrderItemDto {
    @IsNotEmpty()
    @IsUUID()
    productId: string;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    quantity: number;
}

// 2. Define the main payload expected from the client
export class CreateOrderDto {
    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true }) // Tells class-validator to validate each object inside the array
    @Type(() => OrderItemDto)       // Tells class-transformer to convert plain JSON objects into OrderItemDto instances
    items: OrderItemDto[];
}