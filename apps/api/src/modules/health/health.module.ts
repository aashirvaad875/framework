import { Module } from '@framework/core';
import { HealthController } from './controllers/health.controller.js';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
