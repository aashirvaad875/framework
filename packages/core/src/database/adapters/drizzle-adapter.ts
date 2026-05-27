import { Database, eq, and, sql } from 'drizzle-orm';
import { Repository, FindOptions, FindOneOptions, Transaction, DatabaseConnection, CreateOptions, UpdateOptions, DeleteOptions, SaveOptions, BatchOperation } from '../repository.js';

export class DrizzleTransaction implements Transaction {
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

export class DrizzleRepository<T, ID = any> extends Repository<T, ID> {
  constructor(
    private db: Database | any,
    private table: any,
    private entityName: string
  ) {
    super();
  }

  async create(data: Partial<T>, options?: CreateOptions): Promise<T> {
    const result = await this.db.insert(this.table).values(data).returning();
    return result[0];
  }

  async createMany(data: Partial<T>[], options?: CreateOptions): Promise<T[]> {
    return this.db.insert(this.table).values(data).returning();
  }

  async find(options?: FindOptions<T>): Promise<T[]> {
    let query = this.db.select().from(this.table);

    if (options?.where) {
      const conditions = this.buildConditions(options.where);
      if (conditions) {
        query = query.where(conditions);
      }
    }

    if (options?.order) {
      for (const [key, direction] of Object.entries(options.order)) {
        const field = (this.table as any)[key];
        if (field) {
          query = direction === 'ASC' ? query.orderBy(field) : query.orderBy(field);
        }
      }
    }

    if (options?.skip) {
      query = query.offset(options.skip);
    }

    if (options?.take) {
      query = query.limit(options.take);
    }

    return query;
  }

  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    let query = this.db.select().from(this.table);

    if (options.where) {
      const conditions = this.buildConditions(options.where);
      if (conditions) {
        query = query.where(conditions);
      }
    }

    const result = await query.limit(1);
    return result[0] || null;
  }

  async findById(id: ID, options?: FindOneOptions<T>): Promise<T | null> {
    const result = await this.db
      .select()
      .from(this.table)
      .where(eq((this.table as any).id, id));

    return result[0] || null;
  }

  async count(where?: Partial<T>): Promise<number> {
    let query = this.db.select({ count: sql`count(*)` }).from(this.table);

    if (where) {
      const conditions = this.buildConditions(where);
      if (conditions) {
        query = query.where(conditions);
      }
    }

    const result = await query;
    return result[0]?.count || 0;
  }

  async exists(where: Partial<T>): Promise<boolean> {
    const count = await this.count(where);
    return count > 0;
  }

  async update(id: ID, data: Partial<T>, options?: UpdateOptions): Promise<T> {
    const result = await this.db
      .update(this.table)
      .set(data)
      .where(eq((this.table as any).id, id))
      .returning();

    return result[0];
  }

  async updateMany(where: Partial<T>, data: Partial<T>, options?: UpdateOptions): Promise<number> {
    const conditions = this.buildConditions(where);
    let query = this.db.update(this.table).set(data);

    if (conditions) {
      query = query.where(conditions);
    }

    const result = await query;
    return result.count || 0;
  }

  async save(entity: T, options?: SaveOptions): Promise<T> {
    const id = (entity as any).id;
    if (id) {
      return this.update(id, entity, options);
    }
    const result = await this.create(entity, options);
    return result;
  }

  async saveMany(entities: T[], options?: SaveOptions): Promise<T[]> {
    const results = [];
    for (const entity of entities) {
      results.push(await this.save(entity, options));
    }
    return results;
  }

  async delete(id: ID, options?: DeleteOptions): Promise<boolean> {
    const result = await this.db
      .delete(this.table)
      .where(eq((this.table as any).id, id));

    return true;
  }

  async deleteMany(where: Partial<T>, options?: DeleteOptions): Promise<number> {
    const conditions = this.buildConditions(where);
    let query = this.db.delete(this.table);

    if (conditions) {
      query = query.where(conditions);
    }

    const result = await query;
    return result.count || 0;
  }

  async clear(): Promise<void> {
    await this.db.delete(this.table);
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
    return this.db.execute(sql, parameters);
  }

  getRepositoryName(): string {
    return this.entityName;
  }

  private buildConditions(where: Partial<T>): any {
    const conditions = [];

    for (const [key, value] of Object.entries(where)) {
      const field = (this.table as any)[key];
      if (field && value !== undefined && value !== null) {
        conditions.push(eq(field, value));
      }
    }

    if (conditions.length === 0) return null;
    if (conditions.length === 1) return conditions[0];

    return and(...conditions);
  }
}

export class DrizzleConnection implements DatabaseConnection {
  constructor(private db: Database | any) {}

  isConnected(): boolean {
    return this.db !== null && this.db !== undefined;
  }

  async connect(): Promise<void> {
    // Drizzle connects via the underlying driver (passed at construction)
  }

  async disconnect(): Promise<void> {
    // Disconnect based on the underlying driver
    if ((this.db as any).disconnect) {
      await (this.db as any).disconnect();
    }
  }

  async transaction<T>(callback: (txn: Transaction) => Promise<T>): Promise<T> {
    const transaction = new DrizzleTransaction(this.db);
    return (this.db as any).transaction(async (tx: any) => {
      return callback(transaction);
    });
  }

  async raw(sql: string, parameters?: any[]): Promise<any[]> {
    return (this.db as any).execute(sql, parameters);
  }

  async close(): Promise<void> {
    await this.disconnect();
  }

  getDatabase(): Database {
    return this.db;
  }
}
