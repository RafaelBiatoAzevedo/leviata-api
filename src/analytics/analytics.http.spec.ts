import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { JwtStrategy } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { ANALYTICS_PROVIDER } from './analytics.contract';
import { AnalyticsConfig } from './analytics.config';
import { AnalyticsModule } from './analytics.module';

describe('Analytics HTTP authentication and input boundaries', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const oldSecret = process.env.JWT_SECRET;
  const secret = 'isolated-analytics-http-test-key-not-a-production-secret';
  const database = { user: { findFirst: jest.fn() } };
  const storage = {
    report: jest
      .fn()
      .mockResolvedValue({ rows: [], months: [], earliest: null }),
    collect: jest.fn().mockResolvedValue('recorded'),
    cleanup: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = secret;
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ ignoreEnvFile: true }),
        JwtModule.register({ secret }),
        AnalyticsModule,
      ],
      providers: [JwtStrategy, { provide: PrismaService, useValue: database }],
    })
      .overrideProvider(ANALYTICS_PROVIDER)
      .useValue(storage)
      .overrideProvider(AnalyticsConfig)
      .useValue({
        settings: () => ({
          ready: true,
          origins: ['https://portal.test'],
          monthlyLimit: 10000,
          proxyHops: 0,
          missing: [],
        }),
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    jwt = module.get(JwtService);
  });
  beforeEach(() =>
    database.user.findFirst.mockResolvedValue({
      id: 'admin-test',
      email: 'test@example.invalid',
      role: 'ADMIN',
      tokenVersion: 0,
    }),
  );
  afterAll(async () => {
    await app?.close();
    if (oldSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = oldSecret;
  });
  const token = (version = 0) =>
    jwt.sign({ sub: 'admin-test', role: 'ADMIN', version });

  it('rejects unauthenticated reads and accepts real JWTs for both existing admin roles', async () => {
    await request(app.getHttpServer() as Server)
      .get('/analytics/report')
      .expect(401);
    for (const role of ['ADMIN', 'SUPER_ADMIN']) {
      database.user.findFirst.mockResolvedValue({
        id: 'admin-test',
        role,
        tokenVersion: 0,
      });
      const result = await request(app.getHttpServer() as Server)
        .get('/analytics/report')
        .set('Authorization', `Bearer ${token()}`)
        .expect(200);
      expect(result.headers['cache-control']).toBe('private, no-store');
      expect(result.body).toMatchObject({
        status: 'ready',
        data: { pageviews: 0, sessions: null, uniqueVisitors: null },
      });
    }
  });
  it('rejects invalid, expired, revoked tokens and non-admin roles', async () => {
    await request(app.getHttpServer() as Server)
      .get('/analytics/report')
      .set('Authorization', 'Bearer invalid')
      .expect(401);
    const expired = jwt.sign(
      { sub: 'admin-test', version: 0 },
      { expiresIn: -1 },
    );
    await request(app.getHttpServer() as Server)
      .get('/analytics/report')
      .set('Authorization', `Bearer ${expired}`)
      .expect(401);
    await request(app.getHttpServer() as Server)
      .get('/analytics/report')
      .set('Authorization', `Bearer ${token(1)}`)
      .expect(401);
    database.user.findFirst.mockResolvedValue({
      id: 'admin-test',
      role: 'READER',
      tokenVersion: 0,
    });
    await request(app.getHttpServer() as Server)
      .get('/analytics/report')
      .set('Authorization', `Bearer ${token()}`)
      .expect(403);
    database.user.findFirst.mockResolvedValue(null);
    await request(app.getHttpServer() as Server)
      .get('/analytics/report')
      .set('Authorization', `Bearer ${token()}`)
      .expect(401);
  });
  it('validates filter shape, maximum range and rejects unsupported refresh bypasses', async () => {
    for (const query of [
      'from=2026-02-30&to=2026-03-01',
      'from=2026-01-01&to=2026-10-28',
      'from=tomorrow',
      'from[]=2026-10-20',
      'refresh=true',
      'granularity=unknown',
    ]) {
      await request(app.getHttpServer() as Server)
        .get(`/analytics/report?${query}`)
        .set('Authorization', `Bearer ${token()}`)
        .expect(400);
    }
  });
  it('has a separate anonymous write-only collector with strict allowlists', async () => {
    const event = {
      id: 'cc78c66a-3e84-47ba-b7b3-d5c626b2a99a',
      path: '/noticias/:id',
      source: 'direct',
    };
    const collect = (body: object, origin = 'https://portal.test') =>
      request(app.getHttpServer() as Server)
        .post('/analytics/collect')
        .set('Origin', origin)
        .set('User-Agent', 'Mozilla/5.0 Chrome/120')
        .send(body);
    await collect(event).expect(204);
    expect(storage.collect).toHaveBeenCalledTimes(1);
    await collect(event, 'https://untrusted.example').expect(403);
    await collect({ ...event, email: 'never-store@example.invalid' }).expect(
      400,
    );
    await collect({ ...event, path: '/admin/usuarios' }).expect(400);
    await collect({
      ...event,
      source: 'https://personal-subdomain.example',
    }).expect(400);
    await request(app.getHttpServer() as Server)
      .get('/analytics/collect')
      .expect(404);
  });
});
