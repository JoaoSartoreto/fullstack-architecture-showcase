import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserEntity } from './entities/user.entity';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ApiDocsCreateUser, ApiDocsFindAll, ApiDocsGetProfile, ApiDocsUpdateRole, ApiDocsUsersController } from './users.docs';

@ApiDocsUsersController()
@Controller('users')
export class UsersController {

    constructor(private readonly usersService: UsersService) { }

    @Public()
    @Post()
    @ApiDocsCreateUser()
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto.email, createUserDto.password);
    }

    @Get('me')
    @ApiDocsGetProfile()
    getProfile(@CurrentUser() user: UserEntity) {
        return user;
    }

    @Patch(':id/role')
    @Roles(Role.ADMIN)
    @ApiDocsUpdateRole()
    async updateRole(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateRoleDto: UpdateRoleDto,
    ) {
        return this.usersService.updateRole(id, updateRoleDto.role);
    }

    @Get()
    @Roles(Role.STAFF)
    @ApiDocsFindAll()
    findAll() {
        return this.usersService.findAll();
    }
}
