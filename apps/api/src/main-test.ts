import 'reflect-metadata';
import { Application, globalErrorHandler } from '@framework/core';
import { Logger } from '@framework/logger';
import { appConfig } from './config/app.config.js';
import { UserModule } from './modules/users/user.module.js';
import { HealthModule } from './modules/health/health.module.js';

const logger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  try {
    // Create Express application (without database for testing)
    logger.info('Creating application...');
    const app = new Application({
      port: appConfig.port,
      host: appConfig.host,
      corsEnabled: appConfig.corsEnabled,
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

    // Print routes
    logger.info('Registered routes:');
    app.printRoutes();
  } catch (error) {
    logger.error('Bootstrap failed', error as Error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

bootstrap();
