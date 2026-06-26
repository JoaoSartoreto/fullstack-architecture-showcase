import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserEntity } from '../entities/user.entity';
import { UserValidationUtil } from './user-validation.util';

describe('UserValidationUtil', () => {
    describe('validateUserExists', () => {
        it('should throw NotFoundException with a generic message when user is null and no ID is provided', () => {
            expect(() => {
                UserValidationUtil.validateUserExists(null);
            }).toThrow(NotFoundException);

            expect(() => {
                UserValidationUtil.validateUserExists(null);
            }).toThrow('User not found.');
        });

        it('should throw NotFoundException with a specific ID message when user is null and ID is provided', () => {
            const missingId = 'user-uuid-123';

            expect(() => {
                UserValidationUtil.validateUserExists(null, missingId);
            }).toThrow(NotFoundException);

            expect(() => {
                UserValidationUtil.validateUserExists(null, missingId);
            }).toThrow(`User with ID ${missingId} not found.`);
        });

        it('should pass successfully and not throw when a valid user entity is provided', () => {
            const mockUser = { id: 'user-1', email: 'test@example.com' } as UserEntity;

            expect(() => {
                UserValidationUtil.validateUserExists(mockUser);
            }).not.toThrow();
        });
    });

    describe('validateEmailIsUnique', () => {
        it('should throw ConflictException when an existing user is found with the same email', () => {
            const existingUser = { id: 'user-1', email: 'existing@example.com' } as UserEntity;

            expect(() => {
                UserValidationUtil.validateEmailIsUnique(existingUser);
            }).toThrow(ConflictException);

            expect(() => {
                UserValidationUtil.validateEmailIsUnique(existingUser);
            }).toThrow('This e-mail is already in use.');
        });

        it('should pass successfully and not throw when no existing user is found (null payload)', () => {
            expect(() => {
                UserValidationUtil.validateEmailIsUnique(null);
            }).not.toThrow();
        });
    });
});