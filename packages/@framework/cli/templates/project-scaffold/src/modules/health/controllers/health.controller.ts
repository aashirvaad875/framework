import { Controller, Get, Req, Res } from '@framework/core';

@Controller('/health')
export class HealthController {
  @Get()
  health(@Req() _req: any, @Res() res: any): void {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  }
}
