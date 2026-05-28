import { Module } from '@framework/core';
import { HealthController } from './controllers/health.controller.js';

@Module({
  controllers: [HealthController],
  providers: [],
})
export class HealthModule {}
