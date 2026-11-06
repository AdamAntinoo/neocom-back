import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ready (GET) returns readiness with version, environment, and logLevel', () => {
    return request(app.getHttpServer())
      .get('/ready')
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          status: 'ready',
          version: expect.any(String),
          environment: expect.any(String),
          logLevel: expect.any(String),
        });
      });
  });
});
