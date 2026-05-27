import { DataSourceOptions } from 'typeorm';

export const databaseConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'framework_db',
  entities: [],
  synchronize: process.env.NODE_ENV === 'development',
  logging: false,
  migrations: ['dist/migrations/*.js'],
  migrationsTableName: 'migrations',
};
