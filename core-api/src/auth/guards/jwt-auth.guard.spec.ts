// src/auth/guards/jwt-auth.guard.spec.ts
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';

// 1. Mocking the Passport AuthGuard mixin before it's imported by the Guard
jest.mock('@nestjs/passport', () => ({
    AuthGuard: jest.fn().mockImplementation(() => {
        class MockAuthGuard {
            // Declared as a prototype method to prevent instance property shadowing!
            canActivate() {
                return true;
            }
        }
        return MockAuthGuard;
    }),
}));

describe('JwtAuthGuard', () => {
    let guard: JwtAuthGuard;
    let reflector: jest.Mocked<Partial<Reflector>>;

    beforeEach(async () => {
        jest.clearAllMocks();

        // 2. Mocking the Reflector to control the @Public() decorator resolution
        reflector = {
            getAllAndOverride: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                JwtAuthGuard,
                { provide: Reflector, useValue: reflector },
            ],
        }).compile();

        guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    it('should return true immediately and bypass JWT validation if the route is marked as @Public()', () => {
        // Arrange: Simulate finding the IS_PUBLIC_KEY metadata
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

        const mockContext = {
            getHandler: jest.fn(),
            getClass: jest.fn(),
        } as unknown as ExecutionContext;

        // Act
        const result = guard.canActivate(mockContext);

        // Assert
        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledTimes(1);
    });

    it('should delegate to super.canActivate (Passport) if the route is NOT public', () => {
        // Arrange: Simulate a standard protected route (no @Public metadata)
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

        const mockContext = {
            getHandler: jest.fn(),
            getClass: jest.fn(),
        } as unknown as ExecutionContext;

        // Act
        const result = guard.canActivate(mockContext);

        // Assert
        // We expect it to return whatever the superclass prototype returns (true in our mock)
        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledTimes(1);
    });
});