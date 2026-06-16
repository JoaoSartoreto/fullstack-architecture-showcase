import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { RequestContext } from '../../core/context/request-context';
import { UsersService } from '../../users/users.service';

describe('JwtStrategy', () => {
    let strategy: JwtStrategy;
    let configService: jest.Mocked<Partial<ConfigService>>;
    let usersService: jest.Mocked<Partial<UsersService>>;

    beforeEach(async () => {
        jest.clearAllMocks();

        // Mocks the configuration service to provide a dummy JWT secret
        configService = {
            get: jest.fn().mockReturnValue('super-secret-test-key'),
        };

        // Mocks the UsersService with the required methods for the strategy
        usersService = {
            findById: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                JwtStrategy,
                { provide: ConfigService, useValue: configService },
                { provide: UsersService, useValue: usersService },
            ],
        }).compile();

        strategy = module.get<JwtStrategy>(JwtStrategy);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should be defined', () => {
        expect(strategy).toBeDefined();
    });

    describe('validate', () => {
        it('should validate and map the payload correctly while injecting actorId into RequestContext', async () => {
            // Arrange
            const mockPayload = {
                sub: 'actor-999',
                email: 'admin@teste.com',
                role: 'ADMIN',
            };

            const expectedUser = {
                id: mockPayload.sub,
                email: mockPayload.email,
                role: mockPayload.role,
            };

            // Setup the mock to return the user from the "database"
            (usersService.findById as jest.Mock).mockResolvedValue(expectedUser);

            // Simulates an active AsyncLocalStorage bubble created previously by the TraceIdMiddleware
            const mockStore = { traceId: 'trace-123' };
            jest.spyOn(RequestContext, 'getStore').mockReturnValue(mockStore as any);

            // Act
            const result = await strategy.validate(mockPayload);

            // Assert
            expect(usersService.findById).toHaveBeenCalledWith(mockPayload.sub);
            expect(result).toEqual(expectedUser);
            // Verify the crucial side-effect (Actor ID injection for audit logs)
            expect(mockStore).toHaveProperty('actorId', mockPayload.sub);
        });

        it('should safely validate the payload even if RequestContext store is completely absent', async () => {
            // Arrange
            const mockPayload = {
                sub: 'actor-777',
            };

            const expectedUser = {
                id: mockPayload.sub,
                email: 'staff@teste.com',
                role: 'STAFF',
            };

            (usersService.findById as jest.Mock).mockResolvedValue(expectedUser);

            // Simulates a scenario where ALS failed to initialize or the middleware was bypassed
            jest.spyOn(RequestContext, 'getStore').mockReturnValue(undefined);

            // Act
            const result = await strategy.validate(mockPayload);

            // Assert
            expect(usersService.findById).toHaveBeenCalledWith(mockPayload.sub);
            expect(result).toEqual(expectedUser);
        });

        it('should throw an UnauthorizedException if the user no longer exists in the database', async () => {
            // Arrange
            const mockPayload = { sub: 'deleted-user-id' };

            // Simulates the user being deleted or deactivated after the token was issued
            (usersService.findById as jest.Mock).mockResolvedValue(null);

            // Act & Assert
            await expect(strategy.validate(mockPayload)).rejects.toThrow(UnauthorizedException);
            expect(usersService.findById).toHaveBeenCalledWith(mockPayload.sub);
        });
    });
});