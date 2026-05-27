import { Injectable } from '@framework/core';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

@Injectable()
export class UserRepository {
  private users: Map<string, User> = new Map();
  private counter = 1;

  async create(data: Partial<User>): Promise<User> {
    const user: User = {
      id: String(this.counter++),
      email: data.email || '',
      name: data.name || '',
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;
    const updated = { ...user, ...data };
    this.users.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.users.delete(id);
  }
}
