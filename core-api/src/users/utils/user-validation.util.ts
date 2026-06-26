import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserEntity } from '../entities/user.entity';

export class UserValidationUtil {
    static validateUserExists(user: UserEntity | null, userId?: string): asserts user is UserEntity {
        if (!user) {
            const message = userId ? `User with ID ${userId} not found.` : 'User not found.';
            throw new NotFoundException(message);
        }
    }

    static validateEmailIsUnique(existingUser: UserEntity | null): void {
        if (existingUser) {
            throw new ConflictException('This e-mail is already in use.');
        }
    }
}