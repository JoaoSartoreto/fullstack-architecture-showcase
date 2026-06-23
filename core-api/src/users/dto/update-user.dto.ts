import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
    @ApiPropertyOptional({ description: 'New password for the account', minLength: 6 })
    @IsOptional()
    @IsString()
    @MinLength(6)
    readonly password?: string;

    @ApiPropertyOptional({ description: 'Full name of the user' })
    @IsOptional()
    @IsString()
    readonly fullName?: string;
}