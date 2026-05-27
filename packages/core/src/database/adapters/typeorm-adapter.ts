import {
  Repository as TypeOrmRepository,
  DataSource,
  QueryRunner,
  FindOptionsWhere,
  FindOptionsRelations,
  FindOptionsOrder,
  FindOptionsSelect,
} from 'typeorm';
import { Repository, FindOptions, FindOneOptions, Transaction, DatabaseConnection, CreateOptions, UpdateOptions, DeleteOptions, SaveOptions, BatchOperation } from '../repository.js';

export class TypeOrmTransaction implements Transaction {
  constructor(private queryRunner: QueryRunner) {}

  async commit(): Promise<void> {
    await this.queryRunner.commitTransaction();
  }

  async rollback(): Promise<void> {
    await this.queryRunner.rollbackTransaction();
  }

  isActive(): boolean {
    return this.queryRunner.isTransactionActive;
  }
}

export class TypeOrmRepository<T, ID = any> extends Repository<T, ID> {
  constructor(
    private repository: TypeOrmRepository<T>,
    private entityName: string
  ) {
    super();
  }

  async create(data: Partial<T>, options?: CreateOptions): Promise<T> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async createMany(data: Partial<T>[], options?: CreateOptions): Promise<T[]> {
    const entities = this.repository.create(data);
    return this.repository.save(entities);
  }

  async find(options?: FindOptions<T>): Promise<T[]> {
    const findOptions: any = {};

    if (options?.where) {
      findOptions.where = options.where as FindOptionsWhere<T>;
    }
    if (options?.select) {
      findOptions.select = options.select as FindOptionsSelect<T>;
    }
    if (options?.skip) {
      findOptions.skip = options.skip;
    }
    if (options?.take) {
      findOptions.take = options.take;
    }
    if (options?.order) {
      findOptions.order = options.order as FindOptionsOrder<T>;
    }
    if (options?.relations) {
      findOptions.relations = options.relations as FindOptionsRelations<T>;
    }
    if (options?.cache) {
      findOptions.cache = options.cache;
    }

    return this.repository.find(findOptions);
  }

  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    const findOptions: any = {};

    if (options.where) {
      findOptions.where = options.where as FindOptionsWhere<T>;
    }
    if (options.select) {
      findOptions.select = options.select as FindOptionsSelect<T>;
    }
    if (options.order) {
      findOptions.order = options.order as FindOptionsOrder<T>;
    }
    if (options.relations) {
      findOptions.relations = options.relations as FindOptionsRelations<T>;
    }
    if (options.cache) {
      findOptions.cache = options.cache;
    }

    return this.repository.findOne(findOptions);
  }

  async findById(id: ID, options?: FindOneOptions<T>): Promise<T | null> {
    return this.repository.findOne({
      where: { id } as FindOptionsWhere<T>,
      ...(options?.relations && { relations: options.relations as FindOptionsRelations<T> }),
      ...(options?.select && { select: options.select as FindOptionsSelect<T> }),
    });
  }

  async count(where?: Partial<T>): Promise<number> {
    return this.repository.count({
      where: where as FindOptionsWhere<T>,
    });
  }

  async exists(where: Partial<T>): Promise<boolean> {
    const count = await this.repository.count({
      where: where as FindOptionsWhere<T>,
    });
    return count > 0;
  }

  async update(id: ID, data: Partial<T>, options?: UpdateOptions): Promise<T> {
    await this.repository.update({ id } as FindOptionsWhere<T>, data);
    return this.findById(id) as Promise<T>;
  }

  async updateMany(where: Partial<T>, data: Partial<T>, options?: UpdateOptions): Promise<number> {
    const result = await this.repository.update(where as FindOptionsWhere<T>, data);
    return result.affected || 0;
  }

  async save(entity: T, options?: SaveOptions): Promise<T> {
    return this.repository.save(entity);
  }

  async saveMany(entities: T[], options?: SaveOptions): Promise<T[]> {
    return this.repository.save(entities);
  }

  async delete(id: ID, options?: DeleteOptions): Promise<boolean> {
    const result = await this.repository.delete({ id } as FindOptionsWhere<T>);
    return (result.affected || 0) > 0;
  }

  async deleteMany(where: Partial<T>, options?: DeleteOptions): Promise<number> {
    const result = await this.repository.delete(where as FindOptionsWhere<T>);
    return result.affected || 0;
  }

  async clear(): Promise<void> {
    await this.repository.clear();
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
    return this.repository.query(sql, parameters);
  }

  getRepositoryName(): string {
    return this.entityName;
  }
}

export class TypeOrmConnection implements DatabaseConnection {
  constructor(private dataSource: DataSource) {}

  isConnected(): boolean {
    return this.dataSource.isInitialized;
  }

  async connect(): Promise<void> {
    if (!this.isConnected()) {
      await this.dataSource.initialize();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected()) {
      await this.dataSource.destroy();
    }
  }

  async transaction<T>(callback: (txn: Transaction) => Promise<T>): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transaction = new TypeOrmTransaction(queryRunner);
      const result = await callback(transaction);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async raw(sql: string, parameters?: any[]): Promise<any[]> {
    return this.dataSource.query(sql, parameters);
  }

  async close(): Promise<void> {
    await this.disconnect();
  }

  getDataSource(): DataSource {
    return this.dataSource;
  }
}
