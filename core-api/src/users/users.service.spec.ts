import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { UserEntity } from './entities/user.entity';
import { Role } from './enums/role.enum';
import { PageOptionsDto } from '../common/pagination/dto/page-options.dto';
import { Order } from '../common/pagination/enums/order.enum';
import { UserPageOptionsDto } from './dto/user-page-options.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';

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
    it('should create a new user successfully with all fields', async () => {
      // Arrange
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'John Doe',
      };

      const hashedPassword = 'hashedPassword123';
      const savedUser = {
        id: '1',
        email: createUserDto.email,
        passwordHash: hashedPassword,
        fullName: createUserDto.fullName
      } as UserEntity;

      repository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      repository.create.mockReturnValue(savedUser);
      repository.save.mockResolvedValue(savedUser);

      // Act
      const result = await service.create(createUserDto);

      // Assert
      expect(repository.findOne).toHaveBeenCalledWith({ where: { email: createUserDto.email } });
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(repository.create).toHaveBeenCalledWith({
        email: createUserDto.email,
        passwordHash: hashedPassword,
        fullName: createUserDto.fullName,
      });
      expect(repository.save).toHaveBeenCalledWith(savedUser);
      expect(result).toEqual(savedUser);
    });

    it('should throw ConflictException if email already exists', async () => {
      // Arrange
      const createUserDto: CreateUserDto = {
        email: 'existing@example.com',
        password: 'password123',
        fullName: 'testingName'
      };

      repository.findOne.mockResolvedValue({ id: '2', email: 'existing@example.com' });

      // Act & Assert
      await expect(service.create(createUserDto))
        .rejects
        .toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return a paginated array of users', async () => {
      // Arrange
      const mockUsers = [{ id: '1', email: 'test1@test.com' }, { id: '2', email: 'test2@test.com' }];

      const mockPageOptionsDto: PageOptionsDto = {
        order: Order.ASC,
        page: 1,
        take: 10,
        skip: 0,
      } as UserPageOptionsDto;

      // Create a chainable mock for the QueryBuilder
      const queryBuilderMock = {
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
        getRawAndEntities: jest.fn().mockResolvedValue({ entities: mockUsers }),
      };

      // Ensure the repository mock returns our custom builder
      repository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilderMock);

      // Act
      const result = await service.findAll(mockPageOptionsDto);

      // Assert
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(queryBuilderMock.orderBy).toHaveBeenCalledWith('user.createdAt', mockPageOptionsDto.order);
      expect(queryBuilderMock.skip).toHaveBeenCalledWith(mockPageOptionsDto.skip);
      expect(queryBuilderMock.take).toHaveBeenCalledWith(mockPageOptionsDto.take);

      // Assert the paginated response structure
      expect(result.data).toEqual(mockUsers);
      expect(result.meta.itemCount).toBe(2);
      expect(result.meta.page).toBe(1);
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

  describe('update', () => {
    it('should update the password and fullName correctly', async () => {
      // Arrange
      const userId = 'user-123';
      const updateUserDto: UpdateUserDto = {
        password: 'newPassword123',
        fullName: 'John Doe' // <--- Added to payload
      };

      const existingUser = {
        id: userId,
        email: 'test@test.com',
        passwordHash: 'oldHash',
        fullName: 'Old Name'
      } as UserEntity;

      const mockedHashedPassword = 'newHashedPassword123';

      repository.findOne.mockResolvedValue(existingUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockedHashedPassword);
      repository.save.mockImplementation((user: UserEntity) => Promise.resolve(user));

      // Act
      const result = await service.update(userId, updateUserDto);

      // Assert
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);

      // Ensure the save method was called with both mutations applied
      expect(repository.save).toHaveBeenCalledWith({
        id: userId,
        email: 'test@test.com',
        passwordHash: mockedHashedPassword,
        fullName: 'John Doe' // <--- Asserting the mutation happened
      });

      expect(result.passwordHash).toBe(mockedHashedPassword);
      expect(result.fullName).toBe('John Doe');
    });

    it('should throw NotFoundException if user is not found', async () => {
      // Arrange
      const userId = 'non-existent-user';
      repository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(userId, { fullName: 'John Doe' }))
        .rejects
        .toThrow(NotFoundException);
    });
  });
});