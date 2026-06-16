import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class UsersService {

    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
    ) { }

    async create(email: string, passwordPlain: string): Promise<UserEntity> {
        const userExists = await this.userRepository.findOne({ where: { email } });
        if (userExists) throw new ConflictException('This e-mail is already in use.');

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(passwordPlain, saltRounds);

        const newUser = this.userRepository.create({
            email,
            passwordHash: hashedPassword,
        });

        return this.userRepository.save(newUser);
    }

    async findByEmail(email: string): Promise<UserEntity | null> {
        return this.userRepository.findOne({ where: { email } });
    }

    async findById(id: string): Promise<UserEntity | null> {
        return await this.userRepository.findOne({ where: { id } });
    }

    async findAll(): Promise<UserEntity[]> {
        return this.userRepository.find();
    }

    async updateRole(id: string, newRole: Role): Promise<UserEntity> {
        const user = await this.findById(id);

        if (!user) throw new NotFoundException(`User with ID ${id} not found.`);

        user.role = newRole;
        return this.userRepository.save(user);
    }
}
