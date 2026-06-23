import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PageOptionsDto } from '../../common/pagination/dto/page-options.dto';
import { Role } from '../enums/role.enum';

export class UserPageOptionsDto extends PageOptionsDto {
    @ApiPropertyOptional({ description: 'Search by partial email (case-insensitive)' })
    @IsString()
    @IsOptional()
    readonly email?: string;

    @ApiPropertyOptional({ enum: Role, description: 'Filter by specific user role' })
    @IsEnum(Role)
    @IsOptional()
    readonly role?: Role;
}