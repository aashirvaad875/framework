import { Controller, Get, Res } from '@framework/core';

@Controller('/health')
export class HealthController {
  @Get()
  getHealth(@Res() res: any): void {
    res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  }
}
