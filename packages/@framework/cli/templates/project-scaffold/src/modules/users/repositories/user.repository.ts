import { Injectable } from '@dancha/core';
import { getDataSource } from '@dancha/core';
import type { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity.js';

@Injectable()
export class UserRepository {
  private get repo(): Repository<UserEntity> {
    return getDataSource().getRepository(UserEntity);
  }

  async findAll(): Promise<UserEntity[]> {
    return this.repo.find();
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(data: { email: string; name: string }): Promise<UserEntity> {
    const user = this.repo.create(data);
    return this.repo.save(user);
  }

  async update(
    id: string,
    data: Partial<{ email: string; name: string }>,
  ): Promise<UserEntity | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
