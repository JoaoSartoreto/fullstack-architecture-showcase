import { UnauthorizedException } from '@nestjs/common';
import { UserEntity } from '../../users/entities/user.entity';

export class AuthValidationUtil {
    static validateValidCredentials(
        user: Omit<UserEntity, 'passwordHash'> | null
    ): asserts user is Omit<UserEntity, 'passwordHash'> {
        if (!user) {
            throw new UnauthorizedException('Invalid credentials.');
        }
    }
}