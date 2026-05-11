import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { UserEntity } from './entities/user.entity';
import { Role } from '../common/enums/role.enum';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// 1. We create a Mock Factory for the TypeORM Repository.
// This allows us to simulate database responses without needing a real database.
const mockUserRepository = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
});

describe('UsersService', () => {
  let service: UsersService;
  let repository: any; // We use 'any' here to easily access our mock functions

  beforeEach(async () => {
    // 2. We set up an isolated Testing Module
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(UserEntity),
          useFactory: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(getRepositoryToken(UserEntity));
  });

  // 3. Clear all mocks after each test to ensure they don't interfere with each other
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should successfully create a new user and hash the password', async () => {
      // Arrange (Setup the scenario)
      const email = 'test@example.com';
      const password = 'plainPassword123';
      const hashedPassword = 'hashedPassword123';

      // We spy on bcrypt to avoid running the heavy CPU algorithm during tests
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      // Simulate that no user exists with this email
      repository.findOne.mockResolvedValue(null);

      // Simulate the repository create and save methods
      const mockCreatedUser = { email, passwordHash: hashedPassword };
      repository.create.mockReturnValue(mockCreatedUser);
      repository.save.mockResolvedValue({ id: 'uuid-123', ...mockCreatedUser });

      // Act (Execute the function)
      const result = await service.create(email, password);

      // Assert (Verify the results)
      expect(repository.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(repository.create).toHaveBeenCalledWith({ email, passwordHash: hashedPassword });
      expect(repository.save).toHaveBeenCalledWith(mockCreatedUser);
      expect(result.id).toEqual('uuid-123');
      expect(result.email).toEqual(email);
    });

    it('should throw a ConflictException if the email is already in use', async () => {
      // Arrange
      const email = 'existing@example.com';
      const password = 'password123';

      // Simulate that the database found an existing user
      repository.findOne.mockResolvedValue({ id: 'uuid-123', email });

      // Act & Assert
      // We expect the promise to be rejected with a ConflictException
      await expect(service.create(email, password)).rejects.toThrow(ConflictException);

      // Ensure we didn't try to save anything
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      // Arrange
      const mockUsers = [{ id: '1', email: 'test1@test.com' }, { id: '2', email: 'test2@test.com' }];
      repository.find.mockResolvedValue(mockUsers);

      // Act
      const result = await service.findAll();

      // Assert
      expect(repository.find).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
    });
  });

  describe('findById', () => {
    it('should return a user if found', async () => {
      const mockUser = { id: 'uuid-123', email: 'test@test.com' };
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('uuid-123');

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'uuid-123' } });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user is not found', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateRole', () => {
    it('should update and return the user with the new role', async () => {
      const userId = 'uuid-123';
      const newRole = Role.STAFF;
      // We simulate that the current user is a CUSTOMER
      const mockUser = { id: userId, email: 'test@test.com', role: Role.CUSTOMER };

      // findById use findOne, so we mock it
      repository.findOne.mockResolvedValue(mockUser);

      // We simulate that the return from save alread have the updated role
      repository.save.mockResolvedValue({ ...mockUser, role: newRole });

      const result = await service.updateRole(userId, newRole);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
      expect(repository.save).toHaveBeenCalledWith({ ...mockUser, role: newRole });
      expect(result.role).toEqual(newRole);
    });

    it('should throw NotFoundException if user to update does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.updateRole('non-existent-id', Role.ADMIN)).rejects.toThrow(NotFoundException);

      // We guarantee that the database doesn't try to save if the user doesn't exists
      expect(repository.save).not.toHaveBeenCalled();
    });
  });
});