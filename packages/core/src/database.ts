import { DataSource, DataSourceOptions } from 'typeorm';
import { Logger } from '@framework/logger';

const logger = new Logger('Database');

let dataSource: DataSource;

export async function initializeDatabase(options: DataSourceOptions): Promise<DataSource> {
  try {
    dataSource = new DataSource(options);
    await dataSource.initialize();
    logger.info('Database connection established');
    return dataSource;
  } catch (error) {
    logger.error('Failed to initialize database', error as Error);
    throw error;
  }
}

export function getDataSource(): DataSource {
  if (!dataSource) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return dataSource;
}

export async function closeDatabase(): Promise<void> {
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
    logger.info('Database connection closed');
  }
}
