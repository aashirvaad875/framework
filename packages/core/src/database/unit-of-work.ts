import { Repository, Transaction, BatchOperation } from './repository.js';

export interface UnitOfWorkConfig {
  autoCommit?: boolean;
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
}

export interface TrackedEntity {
  entity: any;
  state: 'new' | 'modified' | 'deleted' | 'unchanged';
  originalData?: any;
}

export class UnitOfWork {
  private transaction: Transaction | null = null;
  private trackedEntities = new Map<any, TrackedEntity>();
  private newEntities: any[] = [];
  private modifiedEntities: any[] = [];
  private deletedEntities: any[] = [];
  private repositoryCache = new Map<Function, Repository<any>>();
  private isCommitting = false;
  private config: UnitOfWorkConfig;

  constructor(
    private getRepository: <T>(entity: new () => T) => Repository<T>,
    private createTransaction: () => Promise<Transaction>,
    config?: UnitOfWorkConfig
  ) {
    this.config = {
      autoCommit: false,
      ...config,
    };
  }

  /**
   * Get repository for entity type
   */
  getRepositoryFor<T>(entity: new () => T): Repository<T> {
    if (!this.repositoryCache.has(entity)) {
      this.repositoryCache.set(entity, this.getRepository(entity));
    }
    return this.repositoryCache.get(entity)!;
  }

  /**
   * Start transaction
   */
  async begin(): Promise<void> {
    if (this.transaction) {
      throw new Error('Transaction already started');
    }
    this.transaction = await this.createTransaction();
    this.reset();
  }

  /**
   * Commit transaction
   */
  async commit(): Promise<void> {
    if (!this.transaction) {
      throw new Error('No transaction started');
    }

    if (!this.transaction.isActive()) {
      throw new Error('Transaction is not active');
    }

    try {
      this.isCommitting = true;

      // Apply changes in order: deletes, updates, creates
      await this.applyDeletes();
      await this.applyUpdates();
      await this.applyCreates();

      await this.transaction.commit();
      this.reset();
    } catch (error) {
      await this.rollback();
      throw error;
    } finally {
      this.isCommitting = false;
    }
  }

  /**
   * Rollback transaction
   */
  async rollback(): Promise<void> {
    if (!this.transaction) {
      throw new Error('No transaction started');
    }

    if (this.transaction.isActive()) {
      await this.transaction.rollback();
    }

    this.reset();
  }

  /**
   * Track new entity
   */
  track<T>(entity: T, state: 'new' | 'modified' | 'deleted' = 'new'): void {
    const id = (entity as any).id;

    if (!this.trackedEntities.has(entity)) {
      this.trackedEntities.set(entity, {
        entity,
        state,
        originalData: state === 'modified' ? { ...entity } : undefined,
      });
    } else {
      const tracked = this.trackedEntities.get(entity)!;
      tracked.state = state;
    }

    // Add to appropriate collection
    if (state === 'new') {
      if (!this.newEntities.includes(entity)) {
        this.newEntities.push(entity);
      }
    } else if (state === 'modified') {
      if (!this.modifiedEntities.includes(entity)) {
        this.modifiedEntities.push(entity);
      }
    } else if (state === 'deleted') {
      if (!this.deletedEntities.includes(entity)) {
        this.deletedEntities.push(entity);
      }
    }
  }

  /**
   * Untrack entity
   */
  untrack(entity: any): void {
    this.trackedEntities.delete(entity);
    const newIndex = this.newEntities.indexOf(entity);
    if (newIndex > -1) this.newEntities.splice(newIndex, 1);

    const modIndex = this.modifiedEntities.indexOf(entity);
    if (modIndex > -1) this.modifiedEntities.splice(modIndex, 1);

    const delIndex = this.deletedEntities.indexOf(entity);
    if (delIndex > -1) this.deletedEntities.splice(delIndex, 1);
  }

  /**
   * Get tracked entity state
   */
  getTrackedState(entity: any): 'new' | 'modified' | 'deleted' | 'unchanged' | null {
    const tracked = this.trackedEntities.get(entity);
    return tracked?.state || null;
  }

  /**
   * Get all tracked entities
   */
  getTrackedEntities(): Map<any, TrackedEntity> {
    return new Map(this.trackedEntities);
  }

  /**
   * Get new entities
   */
  getNewEntities(): any[] {
    return [...this.newEntities];
  }

  /**
   * Get modified entities
   */
  getModifiedEntities(): any[] {
    return [...this.modifiedEntities];
  }

  /**
   * Get deleted entities
   */
  getDeletedEntities(): any[] {
    return [...this.deletedEntities];
  }

  /**
   * Check if dirty (has changes)
   */
  isDirty(): boolean {
    return this.newEntities.length > 0 ||
      this.modifiedEntities.length > 0 ||
      this.deletedEntities.length > 0;
  }

  /**
   * Check if transaction is active
   */
  isActive(): boolean {
    return this.transaction?.isActive() ?? false;
  }

  /**
   * Get pending changes count
   */
  getPendingChanges(): number {
    return this.newEntities.length + this.modifiedEntities.length + this.deletedEntities.length;
  }

  private async applyCreates(): Promise<void> {
    for (const entity of this.newEntities) {
      const constructor = entity.constructor;
      const repository = this.getRepositoryFor(constructor);
      await repository.create(entity, { transaction: this.transaction });
    }
  }

  private async applyUpdates(): Promise<void> {
    for (const entity of this.modifiedEntities) {
      const constructor = entity.constructor;
      const repository = this.getRepositoryFor(constructor);
      const id = (entity as any).id;
      await repository.update(id, entity, { transaction: this.transaction });
    }
  }

  private async applyDeletes(): Promise<void> {
    for (const entity of this.deletedEntities) {
      const constructor = entity.constructor;
      const repository = this.getRepositoryFor(constructor);
      const id = (entity as any).id;
      await repository.delete(id, { transaction: this.transaction });
    }
  }

  private reset(): void {
    this.transaction = null;
    this.trackedEntities.clear();
    this.newEntities = [];
    this.modifiedEntities = [];
    this.deletedEntities = [];
    this.repositoryCache.clear();
  }
}
