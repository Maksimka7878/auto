import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/health (GET)', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBeDefined();
        });
    });
  });

  describe('/api/v1/health/live (GET)', () => {
    it('should return liveness status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health/live')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.timestamp).toBeDefined();
        });
    });
  });

  describe('/api/v1/health/ready (GET)', () => {
    it('should return readiness status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBeDefined();
        });
    });
  });

  describe('/api/v1/health/info (GET)', () => {
    it('should return system info', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health/info')
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('AUTOMATION.RUN API');
          expect(res.body.version).toBeDefined();
          expect(res.body.environment).toBeDefined();
          expect(res.body.uptime).toBeDefined();
          expect(res.body.node).toBeDefined();
          expect(res.body.memory).toBeDefined();
          expect(res.body.database).toBeDefined();
        });
    });
  });

  describe('/api/v1/health/metrics (GET)', () => {
    it('should return Prometheus metrics', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health/metrics')
        .expect(200)
        .expect((res) => {
          expect(res.text).toContain('nodejs_heap_size_total_bytes');
          expect(res.text).toContain('nodejs_heap_size_used_bytes');
          expect(res.text).toContain('nodejs_process_uptime_seconds');
        });
    });
  });
});
