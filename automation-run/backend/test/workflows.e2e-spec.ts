import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('WorkflowsController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let workflowId: string;

  const testUser = {
    email: `workflow-test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Workflow Test User',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();

    // Register and get token
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser);

    accessToken = registerRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/workflows (POST)', () => {
    it('should create a new workflow', () => {
      return request(app.getHttpServer())
        .post('/api/v1/workflows')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Workflow',
          description: 'A test workflow',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body._id).toBeDefined();
          expect(res.body.name).toBe('Test Workflow');
          expect(res.body.status).toBe('draft');
          expect(res.body.webhookUrl).toBeDefined();
          workflowId = res.body._id;
        });
    });

    it('should return 401 without auth token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/workflows')
        .send({
          name: 'Test Workflow',
        })
        .expect(401);
    });
  });

  describe('/api/v1/workflows (GET)', () => {
    it('should return list of workflows', () => {
      return request(app.getHttpServer())
        .get('/api/v1/workflows')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.workflows).toBeDefined();
          expect(Array.isArray(res.body.workflows)).toBe(true);
          expect(res.body.total).toBeGreaterThan(0);
        });
    });
  });

  describe('/api/v1/workflows/:id (GET)', () => {
    it('should return workflow by id', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body._id).toBe(workflowId);
          expect(res.body.name).toBe('Test Workflow');
        });
    });

    it('should return 404 for non-existent workflow', () => {
      return request(app.getHttpServer())
        .get('/api/v1/workflows/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('/api/v1/workflows/:id (PUT)', () => {
    it('should update workflow', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Workflow',
          nodes: [
            {
              id: 'node-1',
              type: 'webhook',
              name: 'Webhook Trigger',
              position: { x: 100, y: 100 },
              config: {},
            },
          ],
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Updated Workflow');
          expect(res.body.nodes.length).toBe(1);
        });
    });
  });

  describe('/api/v1/workflows/:id/activate (POST)', () => {
    it('should activate workflow', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/workflows/${workflowId}/activate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.isActive).toBe(true);
          expect(res.body.status).toBe('active');
        });
    });
  });

  describe('/api/v1/workflows/:id/deactivate (POST)', () => {
    it('should deactivate workflow', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/workflows/${workflowId}/deactivate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.isActive).toBe(false);
          expect(res.body.status).toBe('paused');
        });
    });
  });

  describe('/api/v1/workflows/:id/duplicate (POST)', () => {
    it('should duplicate workflow', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/workflows/${workflowId}/duplicate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body._id).not.toBe(workflowId);
          expect(res.body.name).toContain('копия');
          expect(res.body.status).toBe('draft');
        });
    });
  });

  describe('/api/v1/workflows/:id (DELETE)', () => {
    it('should delete workflow', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should return 404 after deletion', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
