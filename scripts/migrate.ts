import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { databaseConfig } from '../src/config/database.config.js';
import { Logger } from '../src/common/logger.js';

const logger = new Logger('Migration');

async function runMigrations(): Promise<void> {
  const dataSource = new DataSource(databaseConfig);

  try {
    await dataSource.initialize();
    logger.info('Running migrations...');

    const pendingMigrations = await dataSource.showMigrations();
    if (pendingMigrations.length === 0) {
      logger.info('No pending migrations');
    } else {
      logger.info(`Found ${pendingMigrations.length} pending migrations`);
    }

    await dataSource.runMigrations();
    logger.info('Migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed', error as Error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runMigrations();
