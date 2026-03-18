import { INestApplication } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import {
  ToxiproxyClient,
  createReportCollector,
  generateReport,
  runScenario,
  waitForToxiproxy,
} from '@libs/chaos';
import * as request from 'supertest';
import { AppModule } from '../app.module.js';

// === Env vars must be set before AppModule import ===
// RedisModule.forRoot() in AppModule reads process.env['REDIS_HOST'] at
// module decorator evaluation time (import), not at compile() time.
process.env['REDIS_HOST'] = 'redis://localhost:6380';
process.env['DATABASE_URL'] = 'postgresql://user:pass@localhost:5433/app';

const TOXIPROXY_API = 'http://localhost:8474';
const REDIS_PROXY_LISTEN = '0.0.0.0:6380';
const REDIS_UPSTREAM = 'redis:6379';
const POSTGRES_PROXY_LISTEN = '0.0.0.0:5433';
const POSTGRES_UPSTREAM = 'db:5432';

describe('URL Shortener — Chaos Tests', () => {
  let app: INestApplication;
  let toxi: ToxiproxyClient;
  const report = createReportCollector('URL Shortener');

  beforeAll(async () => {
    toxi = new ToxiproxyClient(TOXIPROXY_API);

    await waitForToxiproxy(TOXIPROXY_API, { timeoutMs: 30_000 });

    // Reset any leftover state from a previous failed run
    await toxi.reset().catch(() => {
      /* ignore */
    });

    await toxi.ensureProxy({
      name: 'redis',
      listen: REDIS_PROXY_LISTEN,
      upstream: REDIS_UPSTREAM,
    });
    await toxi.ensureProxy({
      name: 'postgres',
      listen: POSTGRES_PROXY_LISTEN,
      upstream: POSTGRES_UPSTREAM,
    });

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }, 60_000);

  afterAll(async () => {
    const reportOutput = generateReport([report.toReport()]);
    console.log('\n' + reportOutput);

    await app?.close();
    await toxi.reset().catch(() => {
      /* ignore */
    });
  });

  beforeEach(async () => {
    await toxi.resetProxy('redis');
    await toxi.resetProxy('postgres');
  });

  // ─── Scenario 1: Redis cache down during redirect ──────────────────
  // Note: CacheModule.register() currently uses in-memory storage, so this
  // scenario tests Redis outage impact on counter/throttler, not cache lookups.
  it('should handle Redis cache outage during redirect (fall through to Postgres)', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/url')
      .send({ url: 'https://example.com/chaos-test-1' })
      .expect(201);

    const shortUrl: string = createRes.body.shortUrl;
    const shortCode = shortUrl.split('/l/')[1];

    await toxi.disableProxy('redis');

    await runScenario(report, 'Redis cache down during redirect', async () => {
      const res = await request(app.getHttpServer())
        .get(`/l/${shortCode}`)
        .redirects(0);

      if (res.status === 302) {
        return {
          passed: true,
          graceful: true,
          notes: 'Graceful fallback to Postgres',
        };
      }

      return {
        passed: false,
        graceful: false,
        notes: `Got ${res.status} — cacheManager.get() likely threw unhandled error`,
      };
    });
  });

  // ─── Scenario 2: Postgres down during URL creation ─────────────────
  it('should return error when Postgres is down during URL creation', async () => {
    await toxi.disableProxy('postgres');

    await runScenario(report, 'Postgres down during URL creation', async () => {
      const res = await request(app.getHttpServer())
        .post('/url')
        .send({ url: 'https://example.com/chaos-test-2' });

      if (res.status >= 500) {
        return {
          passed: true,
          graceful: true,
          notes: `Returns ${res.status} as expected when DB is down`,
        };
      }

      return {
        passed: false,
        graceful: false,
        notes: `Unexpected status ${res.status}`,
      };
    });
  });

  // ─── Scenario 3: Redis counter down during URL creation ────────────
  it('should handle Redis counter failure during URL creation', async () => {
    await toxi.disableProxy('redis');

    await runScenario(
      report,
      'Redis counter down during URL creation',
      async () => {
        const res = await request(app.getHttpServer())
          .post('/url')
          .send({ url: 'https://example.com/chaos-test-3' });

        if (res.status >= 400) {
          return {
            passed: true,
            graceful: res.status < 500,
            notes: `Returns ${res.status} — ${res.status >= 500 ? 'unhandled error' : 'graceful error'}`,
          };
        }

        return {
          passed: false,
          graceful: false,
          notes: `Unexpected success with status ${res.status}`,
        };
      },
    );
  });

  // ─── Scenario 4: High latency on Redis (500ms) ────────────────────
  it('should tolerate high Redis latency (500ms)', async () => {
    await toxi.addToxic('redis', {
      name: 'latency_downstream',
      type: 'latency',
      stream: 'downstream',
      attributes: { latency: 500, jitter: 100 },
    });

    await runScenario(report, 'High latency on Redis (500ms)', async () => {
      const start = Date.now();
      const res = await request(app.getHttpServer())
        .post('/url')
        .send({ url: 'https://example.com/chaos-test-4' });

      const elapsed = Date.now() - start;

      if (res.status === 201) {
        return {
          passed: true,
          graceful: true,
          notes: `Succeeded in ${elapsed}ms (latency amplification: ~${elapsed - 100}ms overhead)`,
        };
      }

      return {
        passed: false,
        graceful: false,
        notes: `Failed with ${res.status} under latency (${elapsed}ms)`,
      };
    });
  });

  // ─── Scenario 5: High latency on Postgres (2s) ────────────────────
  it('should tolerate high Postgres latency (2s)', async () => {
    await toxi.addToxic('postgres', {
      name: 'latency_downstream',
      type: 'latency',
      stream: 'downstream',
      attributes: { latency: 2000, jitter: 500 },
    });

    await runScenario(report, 'High latency on Postgres (2s)', async () => {
      const start = Date.now();
      const res = await request(app.getHttpServer())
        .post('/url')
        .send({ url: 'https://example.com/chaos-test-5' });

      const elapsed = Date.now() - start;

      if (res.status === 201) {
        return {
          passed: true,
          graceful: true,
          notes: `Succeeded in ${elapsed}ms under Postgres latency`,
        };
      }

      return {
        passed: false,
        graceful: false,
        notes: `Failed with ${res.status} (${elapsed}ms)`,
      };
    });
  });

  // ─── Scenario 6: Both Redis + Postgres down ───────────────────────
  it('should produce a clean error when both Redis and Postgres are down', async () => {
    await toxi.disableProxy('redis');
    await toxi.disableProxy('postgres');

    await runScenario(report, 'Both Redis + Postgres down', async () => {
      const res = await request(app.getHttpServer())
        .post('/url')
        .send({ url: 'https://example.com/chaos-test-6' });

      if (res.status >= 500) {
        return {
          passed: true,
          graceful: false,
          notes: `Returns ${res.status} — total failure mode`,
        };
      }

      return {
        passed: false,
        graceful: false,
        notes: `Unexpected status ${res.status} with all infra down`,
      };
    });
  });

  // ─── Scenario 7: Redis recovers after outage ──────────────────────
  it('should recover automatically when Redis comes back', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/url')
      .send({ url: 'https://example.com/chaos-test-7' })
      .expect(201);

    const shortCode = createRes.body.shortUrl.split('/l/')[1];

    await toxi.disableProxy('redis');
    await new Promise((r) => setTimeout(r, 1000));
    await toxi.enableProxy('redis');
    await new Promise((r) => setTimeout(r, 2000));

    await runScenario(report, 'Redis recovers after outage', async () => {
      const res = await request(app.getHttpServer())
        .get(`/l/${shortCode}`)
        .redirects(0);

      if (res.status === 302) {
        return {
          passed: true,
          graceful: true,
          recovery: 'auto',
          notes: 'App recovered automatically after Redis restore',
        };
      }

      return {
        passed: false,
        graceful: false,
        recovery: 'manual',
        notes: `Still failing after restore: ${res.status} — connection pool may need manual recovery`,
      };
    });
  });
});
