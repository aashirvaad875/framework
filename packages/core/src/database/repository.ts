export interface FindOptions<T = any> {
  where?: Partial<T>;
  select?: (keyof T)[];
  skip?: number;
  take?: number;
  order?: Record<string, 'ASC' | 'DESC'>;
  relations?: string[];
  cache?: boolean | number;
}

export interface FindOneOptions<T = any> extends Omit<FindOptions<T>, 'skip' | 'take'> {}

export interface CreateOptions {
  transaction?: any;
}

export interface UpdateOptions {
  transaction?: any;
}

export interface DeleteOptions {
  transaction?: any;
}

export interface SaveOptions {
  transaction?: any;
  reload?: boolean;
}

export interface BatchOperation<T = any> {
  type: 'create' | 'update' | 'delete';
  data?: T;
  id?: any;
}

export interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
  isActive(): boolean;
}

export abstract class Repository<T, ID = any> {
  /**
   * Create a new entity
   */
  abstract create(data: Partial<T>, options?: CreateOptions): Promise<T>;

  /**
   * Create multiple entities
   */
  abstract createMany(data: Partial<T>[], options?: CreateOptions): Promise<T[]>;

  /**
   * Find all entities matching criteria
   */
  abstract find(options?: FindOptions<T>): Promise<T[]>;

  /**
   * Find single entity matching criteria
   */
  abstract findOne(options: FindOneOptions<T>): Promise<T | null>;

  /**
   * Find entity by ID
   */
  abstract findById(id: ID, options?: FindOneOptions<T>): Promise<T | null>;

  /**
   * Count entities matching criteria
   */
  abstract count(where?: Partial<T>): Promise<number>;

  /**
   * Check if entity exists
   */
  abstract exists(where: Partial<T>): Promise<boolean>;

  /**
   * Update entity
   */
  abstract update(id: ID, data: Partial<T>, options?: UpdateOptions): Promise<T>;

  /**
   * Update multiple entities
   */
  abstract updateMany(where: Partial<T>, data: Partial<T>, options?: UpdateOptions): Promise<number>;

  /**
   * Save entity (create or update)
   */
  abstract save(entity: T, options?: SaveOptions): Promise<T>;

  /**
   * Save multiple entities
   */
  abstract saveMany(entities: T[], options?: SaveOptions): Promise<T[]>;

  /**
   * Delete entity
   */
  abstract delete(id: ID, options?: DeleteOptions): Promise<boolean>;

  /**
   * Delete multiple entities
   */
  abstract deleteMany(where: Partial<T>, options?: DeleteOptions): Promise<number>;

  /**
   * Clear all entities (use with caution)
   */
  abstract clear(): Promise<void>;

  /**
   * Perform batch operations
   */
  abstract batch(operations: BatchOperation<T>[]): Promise<void>;

  /**
   * Raw query execution
   */
  abstract query(sql: string, parameters?: any[]): Promise<any[]>;

  /**
   * Get repository name/type
   */
  abstract getRepositoryName(): string;
}

export interface RepositoryFactory {
  getRepository<T>(entity: new () => T): Repository<T>;
  getRepositories(): Map<Function, Repository<any>>;
}

export interface DatabaseConnection {
  isConnected(): boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  transaction<T>(callback: (txn: Transaction) => Promise<T>): Promise<T>;
  raw(sql: string, parameters?: any[]): Promise<any[]>;
  close(): Promise<void>;
}
