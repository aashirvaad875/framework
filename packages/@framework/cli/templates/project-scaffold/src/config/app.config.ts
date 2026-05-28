export const appConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || 'localhost',
  corsEnabled: process.env.CORS_ENABLED !== 'false',
};
