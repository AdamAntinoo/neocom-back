import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@Infra/auth/auth.module.js';
import { LoggerMiddleware } from '@Infra/config/logger.middleware.js';
import { NeocomBackendErrorFilter } from '@Infra/errors/neocom-backend-error.filter.js';
import { PilotModule } from '@Infra/pilot.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Application runtime, EVE SSO, then VERSION. First file wins on duplicate keys.
      envFilePath: ['.env.application', '.env.esisso', '.env.version'],
    }),
    AuthModule,
    PilotModule,
  ],
  controllers: [AppController],
  providers: [AppService, LoggerMiddleware, { provide: APP_FILTER, useClass: NeocomBackendErrorFilter }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
