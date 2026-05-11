import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import { ItemType } from '../enums/item-type.enum';

export class CreateCatalogItemDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    price: number;

    @IsNotEmpty()
    @IsEnum(ItemType)
    type: ItemType;

    @ValidateIf(o => o.type === ItemType.PHYSICAL_GOODS)
    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    stockQuantity?: number;

    @ValidateIf(o => o.type === ItemType.SERVICE)
    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    estimatedDurationHours?: number;
}