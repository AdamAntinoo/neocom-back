import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              ({ VERSION: '0.1.0', ENVIRONMENT: 'local', LOGLEVEL: 'debug' })[
                key
              ],
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('GET /ready', () => {
    it('reports version, environment, and log level', () => {
      expect(appController.getReadiness()).toEqual({
        status: 'ready',
        version: '0.1.0',
        environment: 'local',
        logLevel: 'debug',
      });
    });
  });
});
