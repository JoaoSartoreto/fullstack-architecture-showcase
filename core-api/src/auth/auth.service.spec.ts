import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

// Mock do Bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

const mockUsersService = {
  findByEmail: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: any;
  let jwtService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user without password if credentials are valid', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const userFromDb = { id: '1', email, passwordHash: 'hashedPass', role: 'CUSTOMER' };

      usersService.findByEmail.mockResolvedValue(userFromDb);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(email, password);

      expect(usersService.findByEmail).toHaveBeenCalledWith(email, true);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, 'hashedPass');

      expect(result).toEqual({ id: '1', email, role: 'CUSTOMER' });
    });

    it('should return null if user is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'pass');

      expect(result).toBeNull();
    });

    it('should return null if password is wrong', async () => {
      usersService.findByEmail.mockResolvedValue({ id: '1', passwordHash: 'hashedPass' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrongPass');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return a JWT access token for valid credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const userFromDb = { id: 'uuid-1', email, passwordHash: 'hashedPass' };
      const expectedToken = 'jwt.token.string';

      usersService.findByEmail.mockResolvedValue(userFromDb);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue(expectedToken);

      const result = await service.login(email, password);

      expect(jwtService.sign).toHaveBeenCalledWith({ email, sub: 'uuid-1' });
      expect(result).toEqual({ access_token: expectedToken });
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login('test@example.com', 'pass')).rejects.toThrow(UnauthorizedException);
    });
  });
});