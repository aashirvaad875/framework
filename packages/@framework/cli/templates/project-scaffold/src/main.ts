import 'reflect-metadata';
import { config } from 'dotenv';
config();
import { Application, initializeDatabase, globalErrorHandler } from '@dancha/core';
import { Logger } from '@dancha/logger';
import { appConfig } from './config/app.config.js';
import { databaseConfig } from './config/database.config.js';
import { UserModule } from './modules/users/user.module.js';
import { HealthModule } from './modules/health/health.module.js';

const logger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  logger.info('Initializing database...');
  await initializeDatabase(databaseConfig);

  const app = new Application({
    port: appConfig.port,
    host: appConfig.host,
    corsEnabled: appConfig.corsEnabled,
    globalErrorHandler,
  });

  await app.registerModule(HealthModule);
  await app.registerModule(UserModule);

  await app.start();
  logger.info(`Server running on http://${appConfig.host}:${appConfig.port}`);
}

bootstrap().catch((err) => {
  logger.error('Failed to start', err);
  process.exit(1);
});
