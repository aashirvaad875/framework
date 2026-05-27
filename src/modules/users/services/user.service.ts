import { Injectable } from '../../../core/decorators/index.js';
import { UserRepository } from '../repositories/user.repository.js';
import { CreateUserDto } from '../dtos/create-user.dto.js';
import { UserEntity } from '../entities/user.entity.js';
import { ConflictException } from '../../../core/exceptions/index.js';
import { Logger } from '../../../common/logger.js';

@Injectable()
export class UserService {
  private logger = new Logger('UserService');

  constructor(private userRepository: UserRepository) {}

  async createUser(dto: CreateUserDto): Promise<UserEntity> {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException(`User with email ${dto.email} already exists`);
    }

    const user = await this.userRepository.create({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phoneNumber: dto.phoneNumber,
      bio: dto.bio,
    });

    this.logger.info(`User created`, { userId: user.id, email: user.email });
    return user;
  }

  async getUserById(id: string): Promise<UserEntity> {
    return await this.userRepository.findById(id);
  }

  async getUsers(limit: number = 10, offset: number = 0): Promise<{ data: UserEntity[]; total: number }> {
    const [users, total] = await this.userRepository.findAll(limit, offset);
    return { data: users, total };
  }

  async updateUser(id: string, dto: Partial<CreateUserDto>): Promise<UserEntity> {
    if (dto.email) {
      const existingUser = await this.userRepository.findByEmail(dto.email);
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException(`User with email ${dto.email} already exists`);
      }
    }

    const user = await this.userRepository.update(id, dto);
    this.logger.info(`User updated`, { userId: id });
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await this.userRepository.delete(id);
    this.logger.info(`User deleted`, { userId: id });
  }

  async getActiveUsers(limit: number = 10, offset: number = 0): Promise<{ data: UserEntity[]; total: number }> {
    const [users, total] = await this.userRepository.findActive(limit, offset);
    return { data: users, total };
  }
}
