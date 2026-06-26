import { UnauthorizedException } from '@nestjs/common';
import { UserEntity } from '../../users/entities/user.entity';
import { AuthValidationUtil } from './auth-validation.util';

describe('AuthValidationUtil', () => {
    describe('validateValidCredentials', () => {
        it('should throw UnauthorizedException when user is null', () => {
            expect(() => {
                AuthValidationUtil.validateValidCredentials(null);
            }).toThrow(UnauthorizedException);

            expect(() => {
                AuthValidationUtil.validateValidCredentials(null);
            }).toThrow('Invalid credentials.');
        });

        it('should throw UnauthorizedException when user is undefined', () => {
            expect(() => {
                AuthValidationUtil.validateValidCredentials(undefined as any);
            }).toThrow(UnauthorizedException);
        });

        it('should pass successfully and not throw when a valid user object is provided', () => {
            const mockUser = {
                id: 'user-1',
                email: 'test@example.com'
            } as Omit<UserEntity, 'passwordHash'>;

            expect(() => {
                AuthValidationUtil.validateValidCredentials(mockUser);
            }).not.toThrow();
        });
    });
});