import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserService } from '../../../src/modules/users/services/user.service.js';
import { UserRepository } from '../../../src/modules/users/repositories/user.repository.js';
import { ConflictException, NotFoundException } from '../../../src/core/exceptions/index.js';
import { CreateUserDto } from '../../../src/modules/users/dtos/create-user.dto.js';

describe('UserService', () => {
  let userService: UserService;
  let userRepository: any;

  beforeEach(() => {
    // Mock repository
    userRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findAll: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findActive: vi.fn(),
    };

    userService = new UserService(userRepository);
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const dto: CreateUserDto = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const createdUser = {
        id: '123',
        ...dto,
        isActive: true,
        isEmailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(createdUser);

      const result = await userService.createUser(dto);

      expect(result).toEqual(createdUser);
      expect(userRepository.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(userRepository.create).toHaveBeenCalledWith(dto);
    });

    it('should throw ConflictException if email already exists', async () => {
      const dto: CreateUserDto = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      userRepository.findByEmail.mockResolvedValue({ id: '123', email: dto.email });

      await expect(userService.createUser(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const user = {
        id: '123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      userRepository.findById.mockResolvedValue(user);

      const result = await userService.getUserById('123');

      expect(result).toEqual(user);
      expect(userRepository.findById).toHaveBeenCalledWith('123');
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findById.mockRejectedValue(new NotFoundException('User not found'));

      await expect(userService.getUserById('123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUser', () => {
    it('should update user', async () => {
      const id = '123';
      const dto: Partial<CreateUserDto> = {
        firstName: 'Jane',
      };

      const updatedUser = {
        id,
        email: 'test@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      };

      userRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.updateUser(id, dto);

      expect(result).toEqual(updatedUser);
      expect(userRepository.update).toHaveBeenCalledWith(id, dto);
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const id = '123';

      userRepository.delete.mockResolvedValue(undefined);

      await userService.deleteUser(id);

      expect(userRepository.delete).toHaveBeenCalledWith(id);
    });
  });

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      const users = [
        { id: '1', email: 'user1@example.com' },
        { id: '2', email: 'user2@example.com' },
      ];

      userRepository.findAll.mockResolvedValue([users, 2]);

      const result = await userService.getUsers(10, 0);

      expect(result).toEqual({ data: users, total: 2 });
      expect(userRepository.findAll).toHaveBeenCalledWith(10, 0);
    });
  });
});
