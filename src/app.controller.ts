import { Controller, Get } from '@nestjs/common';
import { AppService, type ReadinessReport } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Readiness probe — version, environment, and log level. */
  @Get('ready')
  getReadiness(): ReadinessReport {
    return this.appService.getReadiness();
  }
}
