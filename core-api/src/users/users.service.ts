import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from './enums/role.enum';
import { PageOptionsDto } from '../common/pagination/dto/page-options.dto';
import { PageDto } from '../common/pagination/dto/page.dto';
import { PageMetaDto } from '../common/pagination/dto/page-meta.dto';
import { applyUserFilters } from './utils/user-query.util';
import { UserPageOptionsDto } from './dto/user-page-options.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {

    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
    ) { }

    // Replace your existing create() method with this one:
    async create(createUserDto: CreateUserDto): Promise<UserEntity> {
        // Isolate the plain text password, group all safe properties into 'userData'
        const { password, ...userData } = createUserDto;

        const userExists = await this.userRepository.findOne({ where: { email: userData.email } });
        if (userExists) throw new ConflictException('This e-mail is already in use.');

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Spread only the safe data, preventing plain-text password from entering the entity scope
        const newUser = this.userRepository.create({
            ...userData,
            passwordHash: hashedPassword,
        });

        return this.userRepository.save(newUser);
    }

    async findByEmail(email: string, includePassword = false): Promise<UserEntity | null> {
        const queryBuilder = this.userRepository.createQueryBuilder('user')
            .where('user.email = :email', { email });

        if (includePassword) {
            queryBuilder.addSelect('user.passwordHash');
        }

        return queryBuilder.getOne();
    }

    async findById(id: string): Promise<UserEntity | null> {
        return await this.userRepository.findOne({ where: { id } });
    }

    async findAll(pageOptionsDto: UserPageOptionsDto): Promise<PageDto<UserEntity>> {
        const queryBuilder = this.userRepository.createQueryBuilder('user');

        // Delegate the dynamic filtering pipeline
        applyUserFilters(queryBuilder, pageOptionsDto);

        const itemCount = await queryBuilder.getCount();
        const { entities } = await queryBuilder.getRawAndEntities();

        const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });

        return new PageDto(entities, pageMetaDto);
    }

    async update(userId: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) throw new NotFoundException('User not found.');

        // Isolate the password for hashing, group everything else into 'safeData'
        const { password, ...safeData } = updateUserDto;

        // Elegantly merge all flat properties without needing endless 'if' statements.
        // If we add 'phoneNumber' to the DTO tomorrow, it automatically maps here!
        Object.assign(user, safeData);

        // Handle the specific cryptographic business logic
        if (password) {
            const saltRounds = 10;
            user.passwordHash = await bcrypt.hash(password, saltRounds);
        }

        return this.userRepository.save(user);
    }

    async updateRole(id: string, newRole: Role): Promise<UserEntity> {
        const user = await this.findById(id);

        if (!user) throw new NotFoundException(`User with ID ${id} not found.`);

        user.role = newRole;
        return this.userRepository.save(user);
    }
}
