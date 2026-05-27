import 'reflect-metadata';
import { Application } from './core/application.js';
import { initializeDatabase, closeDatabase } from './core/database.js';
import { databaseConfig } from './config/database.config.js';
import { appConfig } from './config/app.config.js';
import { UserModule } from './modules/users/user.module.js';
import { Module } from './core/module.js';
import { globalErrorHandler } from './common/error-handler.js';
import { Logger } from './common/logger.js';

const logger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  try {
    // Initialize database
    logger.info('Initializing database...');
    await initializeDatabase(databaseConfig);

    // Create Express application
    logger.info('Creating application...');
    const app = new Application({
      port: appConfig.port,
      host: appConfig.host,
      corsEnabled: appConfig.corsEnabled,
    });

    // Register modules
    logger.info('Registering modules...');
    await app.registerModule(UserModule);

    // Register global error handler
    app.useErrorHandler(globalErrorHandler);

    // Start server
    logger.info(`Starting server on ${appConfig.host}:${appConfig.port}`);
    await app.start();
  } catch (error) {
    logger.error('Bootstrap failed', error as Error);
    await closeDatabase();
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await closeDatabase();
  process.exit(0);
});

bootstrap();
