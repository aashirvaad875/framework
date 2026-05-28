import 'reflect-metadata';
import {
  Application,
  initializeDatabase,
  closeDatabase,
  globalErrorHandler,
  defaultOptimizationConfig,
} from '@framework/core';
import { Logger } from '@framework/logger';
import { databaseConfig } from './config/database.config.js';
import { appConfig } from './config/app.config.js';
import { UserModule } from './modules/users/user.module.js';
import { HealthModule } from './modules/health/health.module.js';

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

    // Configure optimization system with environment-based defaults
    app.configure({
      optimization: defaultOptimizationConfig(process.env.NODE_ENV, {
        layer3: { enabled: process.env.ENABLE_PROFILING === 'true' },
      }),
    });

    // Register modules
    logger.info('Registering modules...');
    await app.registerModule(HealthModule);
    await app.registerModule(UserModule);

    // Register global error handler
    app.useErrorHandler(globalErrorHandler);

    // Start server
    logger.info(`Starting server on ${appConfig.host}:${appConfig.port}`);
    await app.start();

    // Verify optimization system is active
    const manager = app.getOptimizationManager();
    if (manager) {
      logger.info('[Optimization] Framework optimizations enabled');
    }
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

void bootstrap();
