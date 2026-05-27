import { DataSourceOptions } from 'typeorm';
import { UserEntity } from '../modules/users/entities/user.entity.js';

export const databaseConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'framework_db',
  entities: [UserEntity],
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.DB_LOGGING === 'true',
  migrations: ['dist/migrations/*.js'],
  migrationsTableName: 'migrations',
};
