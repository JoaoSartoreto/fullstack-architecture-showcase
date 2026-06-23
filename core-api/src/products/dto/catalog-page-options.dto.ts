import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { PageOptionsDto } from '../../common/pagination/dto/page-options.dto';
import { ItemType } from '../enums/item-type.enum';

export class CatalogPageOptionsDto extends PageOptionsDto {
    @ApiPropertyOptional({ description: 'Search by item name (case-insensitive)' })
    @IsString()
    @IsOptional()
    readonly search?: string;

    @ApiPropertyOptional({ enum: ItemType, description: 'Filter by specific item type' })
    @IsEnum(ItemType)
    @IsOptional()
    readonly type?: ItemType;

    @ApiPropertyOptional({ description: 'Minimum price filter' })
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    readonly minPrice?: number;

    @ApiPropertyOptional({ description: 'Maximum price filter' })
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    readonly maxPrice?: number;

    @ApiPropertyOptional({ description: 'Filter by active/inactive status (Applied in findAll only)' })
    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    readonly isActive?: boolean;
}