import {
  Logger,
  createLogger,
  LoggerModule,
  requestContext,
  CorrelationIdGenerator,
} from '@framework/core';

// Example 1: Basic logging
const logger = createLogger('example', {
  level: 'debug',
  prettyPrint: true,
});

logger.info('Application started');
logger.debug('Debug information', { userId: 123 });
logger.warn('Warning message', { code: 'WARN_001' });
logger.error('Error occurred', new Error('Something failed'), { failureType: 'network' });

// Example 2: With context
const userLogger = createLogger('user-service');
userLogger.setContext({ userId: 456 });
userLogger.info('User created');
userLogger.info('User updated', { changes: { email: 'new@example.com' } });

// Example 3: Timing
const dbLogger = createLogger('database');
const timer = dbLogger.startTimer();
setTimeout(() => {
  const duration = timer();
  dbLogger.info('Query completed', { duration, rows: 100 });
}, 100);

// Example 4: Async timing
async function fetchUser(id: string) {
  const asyncLogger = createLogger('user-fetch');
  return asyncLogger.measureAsync('Fetching user', async () => {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ id, name: 'John' }), 200);
    });
  });
}

// Example 5: Request context
function handleRequest() {
  const { correlationId, traceId } = CorrelationIdGenerator.extractFromHeaders({
    'x-correlation-id': 'abc-123',
  });

  requestContext.set({
    correlationId,
    traceId,
    userId: '789',
  });

  const contextLogger = createLogger('request-handler');
  contextLogger.info('Processing request');
}

// Example 6: Module configuration
const loggerModule = LoggerModule({
  name: 'my-app',
  level: 'info',
  filePath: './logs/app.log',
  prettyPrint: process.env.NODE_ENV !== 'production',
});

// Or with builder
const builtModule = new LoggerModule({
  name: 'my-app',
  level: 'debug',
  filePath: './logs/app.log',
  prettyPrint: true,
});
