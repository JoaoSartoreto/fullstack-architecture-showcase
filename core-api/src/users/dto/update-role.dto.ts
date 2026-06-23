import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '../enums/role.enum';

export class UpdateRoleDto {
    @IsNotEmpty()
    @IsEnum(Role)
    role: Role;
}