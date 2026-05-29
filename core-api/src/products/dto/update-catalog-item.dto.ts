import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCatalogItemDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    stockQuantity?: number;

    @IsOptional()
    @IsNumber()
    @Min(1)
    estimatedDurationHours?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}