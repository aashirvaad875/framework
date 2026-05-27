import { Injectable } from '@framework/core';
import { UserRepository, User } from '../repositories/user.repository.js';

@Injectable()
export class UserService {
  constructor(private userRepository: UserRepository) {}

  async createUser(email: string, name: string): Promise<User> {
    return this.userRepository.create({ email, name });
  }

  async getUserById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | null> {
    return this.userRepository.update(id, data);
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.userRepository.delete(id);
  }
}
