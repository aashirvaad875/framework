import { DataSource, DataSourceOptions } from 'typeorm';
import { Application } from '../core/application.js';
import { Logger } from '../common/logger.js';

const logger = new Logger('TestUtils');

let testDataSource: DataSource;

export async function initializeTestDatabase(options: DataSourceOptions): Promise<DataSource> {
  try {
    testDataSource = new DataSource({
      ...options,
      synchronize: true,
      logging: false,
    });

    await testDataSource.initialize();
    logger.info('Test database initialized');
    return testDataSource;
  } catch (error) {
    logger.error('Failed to initialize test database', error as Error);
    throw error;
  }
}

export async function closeTestDatabase(): Promise<void> {
  if (testDataSource?.isInitialized) {
    await testDataSource.destroy();
    logger.info('Test database closed');
  }
}

export async function clearTestDatabase(): Promise<void> {
  if (!testDataSource?.isInitialized) {
    throw new Error('Test database not initialized');
  }

  const entities = testDataSource.entityMetadatas;

  for (const entity of entities) {
    const repository = testDataSource.getRepository(entity.name);
    await repository.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE`);
  }

  logger.info('Test database cleared');
}

export function createTestApplication(): Application {
  return new Application({
    port: 3001,
    corsEnabled: true,
  });
}
