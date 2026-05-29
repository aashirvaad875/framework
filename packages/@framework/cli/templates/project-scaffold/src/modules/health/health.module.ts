import { Module } from '@dancha/core';
import { HealthController } from './controllers/health.controller.js';

@Module({
  controllers: [HealthController],
  providers: [],
})
export class HealthModule {}
