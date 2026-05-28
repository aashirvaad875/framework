import { Injectable, Inject } from '@framework/core';
import { UserRepository } from '../repositories/user.repository.js';
import type { UserEntity } from '../entities/user.entity.js';
import type { CreateUserDto, UpdateUserDto } from '../dto/index.js';

@Injectable()
export class UserService {
  constructor(@Inject(UserRepository) private userRepository: UserRepository) {}

  async createUser(dto: CreateUserDto): Promise<UserEntity> {
    return this.userRepository.create(dto);
  }

  async getAllUsers(): Promise<UserEntity[]> {
    return this.userRepository.findAll();
  }

  async getUserById(id: string): Promise<UserEntity | null> {
    return this.userRepository.findById(id);
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<UserEntity | null> {
    return this.userRepository.update(id, dto);
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.userRepository.delete(id);
  }
}
