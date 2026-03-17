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

const TOXIPROXY_API = 'http://localhost:8474';
// Toxiproxy listens on port 6379 — the same port the Redis Cluster advertises
// via REDIS_CLUSTER_ANNOUNCE_IP=127.0.0.1. This ensures CLUSTER SLOTS redirects
// to 127.0.0.1:6379 still route through Toxiproxy instead of bypassing it.
const REDIS_PROXY_LISTEN = '0.0.0.0:6379';
const REDIS_UPSTREAM = 'redis-cluster:6379';

describe('Rate Limiter — Chaos Tests', () => {
  let app: INestApplication;
  let toxi: ToxiproxyClient;
  const report = createReportCollector('Rate Limiter');

  beforeAll(async () => {
    toxi = new ToxiproxyClient(TOXIPROXY_API);

    await waitForToxiproxy(TOXIPROXY_API, { timeoutMs: 30_000 });

    // Reset any leftover state from a previous failed run
    await toxi.reset().catch(() => {});

    await toxi.ensureProxy({
      name: 'redis',
      listen: REDIS_PROXY_LISTEN,
      upstream: REDIS_UPSTREAM,
    });

    // Use port 6379 — matches the Toxiproxy proxy port and the cluster's announce IP
    process.env['REDIS_HOST'] = 'redis://localhost:6379';

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
    await toxi.reset().catch(() => {});
  });

  beforeEach(async () => {
    await toxi.resetProxy('redis');
  });

  // ─── Scenario 1: Redis down during rate check (should fail-open) ──
  it('should fail-open when Redis is down during rate check', async () => {
    await request(app.getHttpServer())
      .get('/rate-limit/check/default')
      .expect(200);

    await toxi.disableProxy('redis');

    await runScenario(report, 'Redis down during rate check', async () => {
      const res = await request(app.getHttpServer()).get(
        '/rate-limit/check/default',
      );

      if (res.status === 200) {
        return {
          passed: true,
          graceful: true,
          notes: 'Fails open — request allowed through despite Redis outage',
        };
      }

      return {
        passed: false,
        graceful: false,
        notes: `Got ${res.status} — guard throws unhandled error instead of failing open`,
      };
    });
  });

  // ─── Scenario 2: Redis slow (100ms latency) ───────────────────────
  it('should handle Redis latency (100ms) with degraded performance', async () => {
    await toxi.addToxic('redis', {
      name: 'latency_downstream',
      type: 'latency',
      stream: 'downstream',
      attributes: { latency: 100, jitter: 20 },
    });

    await runScenario(report, 'Redis slow (100ms latency)', async () => {
      const start = Date.now();
      const res = await request(app.getHttpServer()).get(
        '/rate-limit/check/default',
      );
      const elapsed = Date.now() - start;

      if (res.status === 200) {
        return {
          passed: true,
          graceful: true,
          notes: `Rate limiting works under latency (${elapsed}ms response time)`,
        };
      }

      return {
        passed: false,
        graceful: false,
        notes: `Failed with ${res.status} under 100ms latency`,
      };
    });
  });

  // ─── Scenario 3: Redis timeout (5s) ───────────────────────────────
  it('should handle Redis timeout (5s)', async () => {
    await toxi.addToxic('redis', {
      name: 'timeout_downstream',
      type: 'timeout',
      stream: 'downstream',
      attributes: { timeout: 5000 },
    });

    await runScenario(report, 'Redis timeout (5s)', async () => {
      const start = Date.now();
      const res = await request(app.getHttpServer()).get(
        '/rate-limit/check/default',
      );
      const elapsed = Date.now() - start;

      if (res.status === 200) {
        return {
          passed: true,
          graceful: true,
          notes: `Handled timeout gracefully in ${elapsed}ms`,
        };
      }

      return {
        passed: false,
        graceful: false,
        notes: `Got ${res.status} after ${elapsed}ms — likely hung until timeout`,
      };
    });
  });

  // ─── Scenario 4: Rapid connection flap (disable/enable) ───────────
  it('should handle rapid Redis connection flapping', async () => {
    await runScenario(
      report,
      'Redis connection flap (NOSCRIPT recovery)',
      async () => {
        await toxi.disableProxy('redis');
        await new Promise((r) => setTimeout(r, 500));
        await toxi.enableProxy('redis');
        await new Promise((r) => setTimeout(r, 1000));

        const res = await request(app.getHttpServer()).get(
          '/rate-limit/check/default',
        );

        if (res.status === 200) {
          return {
            passed: true,
            graceful: true,
            notes: 'Script recovery works after brief outage',
          };
        }

        return {
          passed: false,
          graceful: false,
          notes: `Got ${res.status} after reconnection — NOSCRIPT recovery may have failed`,
        };
      },
    );
  });

  // ─── Scenario 5: Redis bandwidth limited (1KB/s) ──────────────────
  it('should handle severely bandwidth-limited Redis', async () => {
    await toxi.addToxic('redis', {
      name: 'bandwidth_downstream',
      type: 'bandwidth',
      stream: 'downstream',
      attributes: { rate: 1 },
    });

    await runScenario(report, 'Redis bandwidth limited (1KB/s)', async () => {
      const start = Date.now();
      const res = await request(app.getHttpServer()).get(
        '/rate-limit/check/default',
      );
      const elapsed = Date.now() - start;

      if (res.status === 200) {
        return {
          passed: true,
          graceful: true,
          notes: `Succeeded under bandwidth limit in ${elapsed}ms`,
        };
      }

      return {
        passed: false,
        graceful: false,
        notes: `Got ${res.status} (${elapsed}ms) — partial/corrupted Lua script response`,
      };
    });
  });

  // ─── Scenario 6: Redis recovers after outage ──────────────────────
  it('should resume rate limiting after Redis recovers', async () => {
    await request(app.getHttpServer())
      .get('/rate-limit/check/default')
      .expect(200);

    await toxi.disableProxy('redis');
    await new Promise((r) => setTimeout(r, 1000));
    await toxi.enableProxy('redis');
    await new Promise((r) => setTimeout(r, 2000));

    await runScenario(report, 'Redis recovers after outage', async () => {
      const res = await request(app.getHttpServer()).get(
        '/rate-limit/check/default',
      );

      if (res.status === 200) {
        const hasHeaders = res.headers['x-ratelimit-limit'] !== undefined;
        return {
          passed: true,
          graceful: true,
          recovery: 'auto',
          notes: hasHeaders
            ? 'Fully recovered — rate limit headers present'
            : 'Responded 200 but no rate limit headers — partial recovery',
        };
      }

      return {
        passed: false,
        graceful: false,
        recovery: 'manual',
        notes: `Still failing after restore: ${res.status}`,
      };
    });
  });
});
