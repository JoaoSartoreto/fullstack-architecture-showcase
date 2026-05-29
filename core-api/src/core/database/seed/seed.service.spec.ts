import { Test, TestingModule } from '@nestjs/testing';
import { SeedService } from './seed.service';
import { UsersService } from '../../../users/users.service';
import { ProductsService } from '../../../products/products.service';
import { Role } from '../../../common/enums/role.enum';

describe('SeedService', () => {
    let service: SeedService;
    let usersService: jest.Mocked<Partial<UsersService>>;
    let productsService: jest.Mocked<Partial<ProductsService>>;

    // Store the original environment to restore it after tests
    const originalEnv = process.env;

    beforeEach(async () => {
        jest.clearAllMocks();
        process.env = { ...originalEnv }; // Clone the environment for each test

        // Mocking the dependencies
        usersService = {
            findByEmail: jest.fn(),
            create: jest.fn().mockResolvedValue({ id: 'mock-user-id' }),
            updateRole: jest.fn().mockResolvedValue({}),
        };

        productsService = {
            existsByName: jest.fn(),
            create: jest.fn().mockResolvedValue({}),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SeedService,
                { provide: UsersService, useValue: usersService },
                { provide: ProductsService, useValue: productsService },
            ],
        }).compile();

        service = module.get<SeedService>(SeedService);
    });

    afterAll(() => {
        process.env = originalEnv; // Restore completely after all tests
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('Environment Guard', () => {
        it('should NOT execute seeding if ENABLE_DB_SEED is not true', async () => {
            // Arrange
            process.env.ENABLE_DB_SEED = 'false';

            // Act
            await service.onApplicationBootstrap();

            // Assert
            expect(usersService.findByEmail).not.toHaveBeenCalled();
            expect(productsService.existsByName).not.toHaveBeenCalled();
        });
    });

    describe('Execution and Idempotency', () => {
        beforeEach(() => {
            // Enable seeding for this block
            process.env.ENABLE_DB_SEED = 'true';
        });

        it('should skip seeding for users and items that already exist (Idempotency)', async () => {
            // Arrange: Simulate that EVERYTHING already exists in the database
            (usersService.findByEmail as jest.Mock).mockResolvedValue({ id: 'existing-id' });
            (productsService.existsByName as jest.Mock).mockResolvedValue(true);

            // Act
            await service.onApplicationBootstrap();

            // Assert
            expect(usersService.findByEmail).toHaveBeenCalledTimes(3); // 3 core users
            expect(usersService.create).not.toHaveBeenCalled();
            expect(usersService.updateRole).not.toHaveBeenCalled();

            expect(productsService.existsByName).toHaveBeenCalledTimes(2); // 2 catalog items
            expect(productsService.create).not.toHaveBeenCalled();
        });

        it('should create users, promote roles, and create catalog items if they do not exist', async () => {
            // Arrange: Simulate an empty database
            (usersService.findByEmail as jest.Mock).mockResolvedValue(null);
            (productsService.existsByName as jest.Mock).mockResolvedValue(false);

            // Act
            await service.onApplicationBootstrap();

            // Assert: Users
            expect(usersService.create).toHaveBeenCalledTimes(3);

            // Admin and Staff need role promotion, Customer does not.
            // updateRole should be called twice (for Admin and Staff)
            expect(usersService.updateRole).toHaveBeenCalledTimes(2);
            expect(usersService.updateRole).toHaveBeenCalledWith('mock-user-id', Role.ADMIN);
            expect(usersService.updateRole).toHaveBeenCalledWith('mock-user-id', Role.STAFF);

            // Assert: Catalog
            expect(productsService.create).toHaveBeenCalledTimes(2);
            expect(productsService.create).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'Enterprise Server Rack Rackmount 42U' })
            );
            expect(productsService.create).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'Cloud Infrastructure Architecture Consulting' })
            );
        });
    });
});