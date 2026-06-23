import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserEntity } from './entities/user.entity';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from './enums/role.enum';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ApiDocsCreateUser, ApiDocsFindAll, ApiDocsGetProfile, ApiDocsUpdateRole, ApiDocsUpdateUser, ApiDocsUsersController } from './users.docs';
import { PageOptionsDto } from '../common/pagination/dto/page-options.dto';
import { UserPageOptionsDto } from './dto/user-page-options.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiDocsUsersController()
@Controller('users')
export class UsersController {

    constructor(private readonly usersService: UsersService) { }

    @Get()
    @Roles(Role.STAFF)
    @ApiDocsFindAll()
    findAll(@Query() pageOptionsDto: UserPageOptionsDto) {
        return this.usersService.findAll(pageOptionsDto);
    }

    @Get('me')
    @ApiDocsGetProfile()
    getProfile(@CurrentUser() user: UserEntity) {
        return user;
    }

    @Public()
    @Post()
    @ApiDocsCreateUser()
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @Patch('me')
    @ApiDocsUpdateUser()
    async updateProfile(
        @CurrentUser() user: UserEntity,
        @Body() updateProfileDto: UpdateUserDto,
    ) {
        return this.usersService.update(user.id, updateProfileDto);
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
}
