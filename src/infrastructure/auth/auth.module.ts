import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { V1AuthController } from '@Infra/adapters/inbound/auth/v1-auth.controller.js';
import { AccessCookieMiddleware } from './access-cookie.middleware.js';
import { AuthService } from './auth.service.js';
import { createEsiTokenManager, ESI_TOKEN_MANAGER } from './esi-token-manager.provider.js';

@Module({
  controllers: [V1AuthController],
  providers: [
    AuthService,
    AccessCookieMiddleware,
    {
      provide: ESI_TOKEN_MANAGER,
      inject: [ConfigService],
      useFactory: createEsiTokenManager,
    },
  ],
  exports: [AuthService, ESI_TOKEN_MANAGER],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AccessCookieMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
