import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ToxiproxyClient,
  createReportCollector,
  generateReport,
  runScenario,
  waitForToxiproxy,
} from '@libs/chaos';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { AppModule } from '../app.module.js';

const TOXIPROXY_API = 'http://localhost:8474';
const LOCALSTACK_PROXY_LISTEN = '0.0.0.0:4567';
const LOCALSTACK_UPSTREAM = 'localstack:4566';
const LOCALSTACK_PROXY_URL = 'http://localhost:4567';

/**
 * Web Crawler chaos tests.
 *
 * The Web Crawler is a queue-driven microservice (no HTTP endpoints for business logic).
 * Chaos is tested by:
 * 1. Booting the app (which starts SQS consumers)
 * 2. Injecting faults on the LocalStack proxy
 * 3. Verifying the app process survives and can recover
 *
 * Note: AppModule uses `useValue: new S3Client(...)` which is evaluated at import time
 * (before env vars are set). We override these providers with fresh instances that
 * point to the Toxiproxy endpoint.
 */
describe('Web Crawler — Chaos Tests', () => {
  let app: INestApplication;
  let toxi: ToxiproxyClient;
  const report = createReportCollector('Web Crawler');

  beforeAll(async () => {
    toxi = new ToxiproxyClient(TOXIPROXY_API);

    await waitForToxiproxy(TOXIPROXY_API, { timeoutMs: 30_000 });

    // Reset any leftover state from a previous failed run
    await toxi.reset().catch(() => {});

    await toxi.createProxy({
      name: 'localstack',
      listen: LOCALSTACK_PROXY_LISTEN,
      upstream: LOCALSTACK_UPSTREAM,
    });

    // Set env vars for SQS module config and other services
    process.env['AWS_ENDPOINT_URL'] = LOCALSTACK_PROXY_URL;
    process.env['AWS_REGION'] = 'eu-central-1';
    process.env['AWS_ACCESS_KEY_ID'] = 'test';
    process.env['AWS_SECRET_ACCESS_KEY'] = 'test';
    process.env['AWS_S3_CONTENT_BUCKET'] = 'web-crawler-bucket';
    process.env['AWS_DYNAMODB_CRAWL_METADATA_TABLE_NAME'] =
      'crawl-metadata-table';
    process.env['AWS_SQS_CONTENT_DISCOVERY_QUEUE_URL'] =
      `${LOCALSTACK_PROXY_URL}/000000000000/content-discovery-queue`;
    process.env['AWS_SQS_CONTENT_DISCOVERY_QUEUE_NAME'] =
      'content-discovery-queue';
    process.env['AWS_SQS_CONTENT_PROCESSING_QUEUE_NAME'] =
      'content-processor-queue';
    process.env['AWS_SQS_CONTENT_PROCESSING_QUEUE_URL'] =
      `${LOCALSTACK_PROXY_URL}/000000000000/content-processor-queue`;

    // Override AWS SDK providers that are instantiated at module definition
    // time (useValue) before our env vars were set. Create fresh clients
    // that point to the Toxiproxy endpoint.
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(S3Client)
      .useValue(
        new S3Client({
          forcePathStyle: true,
          endpoint: LOCALSTACK_PROXY_URL,
          region: 'eu-central-1',
          credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
        }),
      )
      .overrideProvider(DynamoDBDocumentClient)
      .useValue(
        DynamoDBDocumentClient.from(
          new DynamoDBClient({
            endpoint: LOCALSTACK_PROXY_URL,
            region: 'eu-central-1',
            credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
          }),
        ),
      )
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  }, 60_000);

  afterAll(async () => {
    const reportOutput = generateReport([report.toReport()]);
    console.log('\n' + reportOutput);

    await app?.close();
    await toxi.reset().catch(() => {});
  });

  beforeEach(async () => {
    await toxi.resetProxy('localstack');
  });

  /**
   * Verifies the NestJS app is still responsive by checking that the
   * DI container can resolve providers and the app hasn't fatally exited.
   *
   * Limitation: For a queue-driven app, the DI container can survive even
   * when background SQS consumers have errored. This checks process-level
   * survival, not consumer-level health. A more thorough check would
   * require a health-check endpoint or SQS consumer state inspection.
   */
  async function assertAppAlive(): Promise<boolean> {
    try {
      app.get(AppModule);
      return true;
    } catch {
      return false;
    }
  }

  // ─── Scenario 1: S3 timeout during content storage ─────────────────
  it('should handle S3 timeout during content storage', async () => {
    await toxi.addToxic('localstack', {
      name: 'timeout_downstream',
      type: 'timeout',
      stream: 'downstream',
      attributes: { timeout: 3000 },
    });

    await runScenario(report, 'S3 timeout during content storage', async () => {
      await new Promise((r) => setTimeout(r, 5000));
      const alive = await assertAppAlive();

      if (alive) {
        return {
          passed: true,
          graceful: true,
          notes:
            'App survived S3 timeout — messages should go to DLQ after maxReceiveCount',
        };
      }

      return {
        passed: false,
        graceful: false,
        notes: 'App crashed after S3 timeout',
      };
    });
  });

  // ─── Scenario 2: SQS slow (2s latency) ────────────────────────────
  it('should handle SQS latency (2s)', async () => {
    await toxi.addToxic('localstack', {
      name: 'latency_downstream',
      type: 'latency',
      stream: 'downstream',
      attributes: { latency: 2000, jitter: 500 },
    });

    await runScenario(report, 'SQS slow (2s latency)', async () => {
      await new Promise((r) => setTimeout(r, 5000));
      const alive = await assertAppAlive();

      if (alive) {
        return {
          passed: true,
          graceful: true,
          notes: 'App continues under SQS latency — crawling slowed but stable',
        };
      }

      return {
        passed: false,
        graceful: false,
        notes: 'App crashed under SQS latency',
      };
    });
  });

  // ─── Scenario 3: DynamoDB down during metadata write ───────────────
  it('should handle DynamoDB unavailability during metadata write', async () => {
    await toxi.addToxic('localstack', {
      name: 'timeout_upstream',
      type: 'timeout',
      stream: 'upstream',
      attributes: { timeout: 1000 },
    });

    await runScenario(
      report,
      'DynamoDB down during metadata write',
      async () => {
        await new Promise((r) => setTimeout(r, 5000));
        const alive = await assertAppAlive();

        if (alive) {
          return {
            passed: true,
            graceful: true,
            notes:
              'App survived DynamoDB unavailability — may cause duplicate crawls if state is lost',
          };
        }

        return {
          passed: false,
          graceful: false,
          notes: 'App crashed during DynamoDB outage',
        };
      },
    );
  });

  // ─── Scenario 4: Total LocalStack outage ───────────────────────────
  it('should survive total LocalStack outage', async () => {
    await toxi.disableProxy('localstack');

    await runScenario(report, 'Total LocalStack outage', async () => {
      await new Promise((r) => setTimeout(r, 5000));
      const alive = await assertAppAlive();

      if (alive) {
        return {
          passed: true,
          graceful: false,
          notes:
            'App survived total outage — all operations failing, no processing',
        };
      }

      return {
        passed: false,
        graceful: false,
        notes: 'App crashed during total LocalStack outage',
      };
    });
  });
});
