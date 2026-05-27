import 'reflect-metadata';
import { initializeDatabase, closeDatabase } from '../src/core/database.js';
import { databaseConfig } from '../src/config/database.config.js';
import { seedUsers } from '../src/seeds/user.seed.js';
import { Logger } from '../src/common/logger.js';

const logger = new Logger('Seed');

async function runSeeds(): Promise<void> {
  try {
    logger.info('Initializing database...');
    await initializeDatabase(databaseConfig);

    logger.info('Running seeds...');
    await seedUsers();

    logger.info('Seeds completed successfully');
  } catch (error) {
    logger.error('Seeding failed', error as Error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

runSeeds();
