import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ReadinessReport = {
  status: 'ready';
  version: string;
  environment: string;
  logLevel: string;
};

@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService) {}

  /** Process readiness: app version, runtime environment, and log level. */
  getReadiness(): ReadinessReport {
    return {
      status: 'ready',
      version: this.config.get<string>('VERSION') ?? 'unknown',
      environment: this.config.get<string>('ENVIRONMENT') ?? 'unknown',
      logLevel: this.config.get<string>('LOGLEVEL') ?? 'debug',
    };
  }
}
