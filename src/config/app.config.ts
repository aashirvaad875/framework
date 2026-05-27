import dotenv from 'dotenv';

dotenv.config();

export const appConfig = {
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000'),
  host: process.env.HOST || 'localhost',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  logLevel: process.env.LOG_LEVEL || 'info',
  corsEnabled: process.env.CORS_ENABLED !== 'false',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['*'],
};
