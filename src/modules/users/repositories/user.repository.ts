import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity.js';
import { getDataSource } from '../../../core/database.js';
import { NotFoundException } from '../../../core/exceptions/index.js';

export class UserRepository {
  private repository: Repository<UserEntity>;

  constructor() {
    this.repository = getDataSource().getRepository(UserEntity);
  }

  async create(data: Partial<UserEntity>): Promise<UserEntity> {
    const user = this.repository.create(data);
    return await this.repository.save(user);
  }

  async findById(id: string): Promise<UserEntity> {
    const user = await this.repository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return await this.repository.findOne({ where: { email } });
  }

  async findAll(limit: number = 10, offset: number = 0): Promise<[UserEntity[], number]> {
    return await this.repository.findAndCount({
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, data: Partial<UserEntity>): Promise<UserEntity> {
    const user = await this.findById(id);
    Object.assign(user, data);
    return await this.repository.save(user);
  }

  async delete(id: string): Promise<void> {
    const result = await this.repository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
  }

  async findActive(limit: number = 10, offset: number = 0): Promise<[UserEntity[], number]> {
    return await this.repository.findAndCount({
      where: { isActive: true },
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });
  }
}
