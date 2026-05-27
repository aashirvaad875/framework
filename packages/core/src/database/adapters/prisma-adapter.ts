import { PrismaClient } from '@prisma/client';
import { Repository, FindOptions, FindOneOptions, Transaction, DatabaseConnection, CreateOptions, UpdateOptions, DeleteOptions, SaveOptions, BatchOperation } from '../repository.js';

export class PrismaTransaction implements Transaction {
  private isActive = true;

  constructor(private tx: any) {}

  async commit(): Promise<void> {
    this.isActive = false;
  }

  async rollback(): Promise<void> {
    this.isActive = false;
  }

  isTransactionActive(): boolean {
    return this.isActive;
  }
}

export class PrismaRepository<T, ID = any> extends Repository<T, ID> {
  constructor(
    private model: any,
    private entityName: string
  ) {
    super();
  }

  async create(data: Partial<T>, options?: CreateOptions): Promise<T> {
    return this.model.create({ data });
  }

  async createMany(data: Partial<T>[], options?: CreateOptions): Promise<T[]> {
    return this.model.createMany({ data });
  }

  async find(options?: FindOptions<T>): Promise<T[]> {
    const findOptions: any = {};

    if (options?.where) {
      findOptions.where = options.where;
    }
    if (options?.select) {
      const select = options.select.reduce(
        (acc: any, field: any) => {
          acc[field] = true;
          return acc;
        },
        {}
      );
      findOptions.select = select;
    }
    if (options?.skip) {
      findOptions.skip = options.skip;
    }
    if (options?.take) {
      findOptions.take = options.take;
    }
    if (options?.order) {
      findOptions.orderBy = Object.entries(options.order).map(([key, value]) => ({
        [key]: value.toLowerCase(),
      }));
    }
    if (options?.relations) {
      const include = options.relations.reduce(
        (acc: any, rel: any) => {
          acc[rel] = true;
          return acc;
        },
        {}
      );
      findOptions.include = include;
    }

    return this.model.findMany(findOptions);
  }

  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    const findOptions: any = {};

    if (options.where) {
      findOptions.where = options.where;
    }
    if (options.select) {
      const select = options.select.reduce(
        (acc: any, field: any) => {
          acc[field] = true;
          return acc;
        },
        {}
      );
      findOptions.select = select;
    }
    if (options.relations) {
      const include = options.relations.reduce(
        (acc: any, rel: any) => {
          acc[rel] = true;
          return acc;
        },
        {}
      );
      findOptions.include = include;
    }

    return this.model.findFirst(findOptions);
  }

  async findById(id: ID, options?: FindOneOptions<T>): Promise<T | null> {
    const findOptions: any = {
      where: { id },
    };

    if (options?.relations) {
      findOptions.include = options.relations.reduce(
        (acc: any, rel: any) => {
          acc[rel] = true;
          return acc;
        },
        {}
      );
    }

    return this.model.findUnique(findOptions);
  }

  async count(where?: Partial<T>): Promise<number> {
    return this.model.count({
      where: where || {},
    });
  }

  async exists(where: Partial<T>): Promise<boolean> {
    const count = await this.count(where);
    return count > 0;
  }

  async update(id: ID, data: Partial<T>, options?: UpdateOptions): Promise<T> {
    return this.model.update({
      where: { id },
      data,
    });
  }

  async updateMany(where: Partial<T>, data: Partial<T>, options?: UpdateOptions): Promise<number> {
    const result = await this.model.updateMany({
      where,
      data,
    });
    return result.count;
  }

  async save(entity: T, options?: SaveOptions): Promise<T> {
    const id = (entity as any).id;
    if (id) {
      return this.model.update({
        where: { id },
        data: entity,
      });
    }
    return this.model.create({
      data: entity,
    });
  }

  async saveMany(entities: T[], options?: SaveOptions): Promise<T[]> {
    const results = [];
    for (const entity of entities) {
      results.push(await this.save(entity, options));
    }
    return results;
  }

  async delete(id: ID, options?: DeleteOptions): Promise<boolean> {
    try {
      await this.model.delete({ where: { id } });
      return true;
    } catch (error) {
      return false;
    }
  }

  async deleteMany(where: Partial<T>, options?: DeleteOptions): Promise<number> {
    const result = await this.model.deleteMany({ where });
    return result.count;
  }

  async clear(): Promise<void> {
    await this.model.deleteMany({});
  }

  async batch(operations: BatchOperation<T>[]): Promise<void> {
    for (const op of operations) {
      if (op.type === 'create' && op.data) {
        await this.create(op.data);
      } else if (op.type === 'update' && op.id && op.data) {
        await this.update(op.id, op.data);
      } else if (op.type === 'delete' && op.id) {
        await this.delete(op.id);
      }
    }
  }

  async query(sql: string, parameters?: any[]): Promise<any[]> {
    return (this.model as any).$queryRaw`${sql}`;
  }

  getRepositoryName(): string {
    return this.entityName;
  }
}

export class PrismaConnection implements DatabaseConnection {
  constructor(private client: PrismaClient) {}

  isConnected(): boolean {
    return (this.client as any)._engine !== undefined;
  }

  async connect(): Promise<void> {
    try {
      await this.client.$connect();
    } catch (error) {
      // Already connected
    }
  }

  async disconnect(): Promise<void> {
    await this.client.$disconnect();
  }

  async transaction<T>(callback: (txn: Transaction) => Promise<T>): Promise<T> {
    const transaction = new PrismaTransaction(this.client.$transaction);
    return (this.client as any).$transaction(async (tx: any) => {
      return callback(transaction);
    });
  }

  async raw(sql: string, parameters?: any[]): Promise<any[]> {
    return (this.client as any).$queryRaw(sql, ...(parameters || []));
  }

  async close(): Promise<void> {
    await this.disconnect();
  }

  getClient(): PrismaClient {
    return this.client;
  }
}
