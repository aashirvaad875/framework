import {
  Controller,
  Get,
  Query,
} from '@framework/core';

@Controller('/health')
export class HealthController {
  @Get()
  healthCheck(@Query('check') check?: string) {
    return {
      status: 'ok',
      timestamp: new Date(),
      check: check || 'basic',
    };
  }
}
