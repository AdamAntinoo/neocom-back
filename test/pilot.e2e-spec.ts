import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { PILOT_SOURCE } from '@App/ports/pilot-source.port.js';
import type { PilotV2 } from '@Domain/pilot/pilot.js';

const pilot: PilotV2 = {
  pilotId: 93813310,
  name: 'Perico Tuerto',
  totalSkillpoints: 12,
  walletBalance: 34,
  currentShipName: 'Venture',
  currentShipTypeName: 'Venture',
  lastKnownLocation: {},
};

describe('Pilot endpoint (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PILOT_SOURCE)
      .useValue({
        findById: (pilotId: number) => Promise.resolve({ ...pilot, pilotId }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('GET /v1/pilots/:pilotId returns StandardError when pilotId is not an integer', () => {
    return request(app.getHttpServer())
      .get('/v1/pilots/not-a-number')
      .expect(400)
      .expect((response) => {
        expect(response.body.errors).toEqual([
          {
            code: 'INVALID_REQUEST',
            description: 'pilotId must be an integer.',
            field: 'pilotId',
            container: 'path',
            value: 'not-a-number',
          },
        ]);
      });
  });

  it('GET /v1/pilots/:pilotId returns the PilotV1Dto without the private section when not logged in', () => {
    return request(app.getHttpServer())
      .get('/v1/pilots/93813310')
      .expect(200)
      .expect((response) => {
        expect(response.body.pilotId).toBe(93813310);
        expect(response.body.name).toBe('Perico Tuerto');
        expect(response.body).not.toHaveProperty('totalSkillpoints');
        expect(response.body).not.toHaveProperty('walletBalance');
        expect(response.body).not.toHaveProperty('currentShipName');
        expect(response.body).not.toHaveProperty('currentShipTypeName');
        expect(response.body).not.toHaveProperty('lastKnownLocation');
      });
  });

  it('GET /v1/pilots/:pilotId includes the private section when an authorization header is present', () => {
    return request(app.getHttpServer())
      .get('/v1/pilots/93813310')
      .set('Authorization', 'present')
      .expect(200)
      .expect((response) => {
        expect(response.body.totalSkillpoints).toBe(12);
        expect(response.body.walletBalance).toBe(34);
        expect(response.body.currentShipName).toBe('Venture');
        expect(response.body.lastKnownLocation).toEqual({});
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
