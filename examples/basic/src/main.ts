import 'reflect-metadata';
import { Application } from '@framework/core';
import { Logger } from '@framework/logger';

const logger = new Logger('BasicExample');

async function main(): Promise<void> {
  logger.info('Starting basic framework example...');

  const app = new Application({
    port: 3000,
    host: 'localhost',
    corsEnabled: true,
  });

  logger.info('Example server configured');
  logger.info('Use @framework/core to define controllers and services');
  logger.info('Visit the ARCHITECTURE.md for complete framework documentation');

  await app.start();
}

main().catch(err => {
  logger.error('Example failed', err);
  process.exit(1);
});
