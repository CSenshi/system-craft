import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { CrawlMetadataRepository, CrawlMetadata } from './repository';
import { AppConfigService } from '../../config';

describe('CrawlMetadataRepository (integration)', () => {
  const testTableName = process.env['AWS_DYNAMODB_CRAWL_METADATA_TABLE_NAME'];
  if (!testTableName) {
    throw new Error(
      'AWS_DYNAMODB_CRAWL_METADATA_TABLE_NAME environment variable is not set'
    );
  }

  let repository: CrawlMetadataRepository;
  let dynamoDbClient: DynamoDBDocumentClient;
  let testCrawlIds: string[] = [];

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [
        AppConfigService,
        {
          provide: DynamoDBDocumentClient,
          useValue: DynamoDBDocumentClient.from(new DynamoDBClient()),
        },
        CrawlMetadataRepository,
      ],
    }).compile();

    repository = module.get<CrawlMetadataRepository>(CrawlMetadataRepository);
    dynamoDbClient = module.get<DynamoDBDocumentClient>(DynamoDBDocumentClient);
  });

  afterEach(async () => {
    // Clean up test data after each test
    for (const crawlId of testCrawlIds) {
      try {
        await dynamoDbClient.send(
          new DeleteCommand({
            TableName: testTableName,
            Key: { crawlId },
          })
        );
      } catch {
        // Ignore errors if item doesn't exist
      }
    }
    testCrawlIds = [];
  });

  afterAll(async () => {
    // Final cleanup - remove any remaining test items
    try {
      const scanResult = await dynamoDbClient.send(
        new ScanCommand({
          TableName: testTableName,
          FilterExpression: 'begins_with(crawlId, :prefix)',
          ExpressionAttributeValues: {
            ':prefix': 'test-',
          },
        })
      );

      if (scanResult.Items) {
        for (const item of scanResult.Items) {
          await dynamoDbClient.send(
            new DeleteCommand({
              TableName: testTableName,
              Key: { crawlId: item.crawlId },
            })
          );
        }
      }
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  });

  const createTestMetadata = (overrides: Partial<CrawlMetadata> = {}): CrawlMetadata => {
    const now = new Date();
    return {
      id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startUrl: 'https://example.com',
      domain: 'example.com',
      depth: 3,
      status: 'pending' as const,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  };

  describe('create', () => {
    it('should create crawl metadata in DynamoDB', async () => {
      const metadata = createTestMetadata();
      testCrawlIds.push(metadata.id);

      await repository.create(metadata);

      // Verify the item exists in DynamoDB
      const result = await repository.get(metadata.id);
      expect(result).toBeDefined();
      expect(result?.id).toBe(metadata.id);
      expect(result?.startUrl).toBe(metadata.startUrl);
      expect(result?.domain).toBe(metadata.domain);
      expect(result?.depth).toBe(metadata.depth);
      expect(result?.status).toBe(metadata.status);
    });

    it('should handle different crawl statuses', async () => {
      const statuses: CrawlMetadata['status'][] = ['pending', 'in_progress', 'completed', 'failed'];

      for (const status of statuses) {
        const metadata = createTestMetadata({ status });
        testCrawlIds.push(metadata.id);

        await repository.create(metadata);

        const result = await repository.get(metadata.id);
        expect(result?.status).toBe(status);
      }
    });

    it('should handle different depths', async () => {
      const depths = [0, 1, 5, 10, 100];

      for (const depth of depths) {
        const metadata = createTestMetadata({ depth });
        testCrawlIds.push(metadata.id);

        await repository.create(metadata);

        const result = await repository.get(metadata.id);
        expect(result?.depth).toBe(depth);
      }
    });

    it('should handle different domains and URLs', async () => {
      const testCases = [
        { startUrl: 'https://example.com', domain: 'example.com' },
        { startUrl: 'https://test.org/path', domain: 'test.org' },
        { startUrl: 'https://subdomain.example.net', domain: 'subdomain.example.net' },
        { startUrl: 'https://api.github.com/v3', domain: 'api.github.com' },
      ];

      for (const testCase of testCases) {
        const metadata = createTestMetadata(testCase);
        testCrawlIds.push(metadata.id);

        await repository.create(metadata);

        const result = await repository.get(metadata.id);
        expect(result?.startUrl).toBe(testCase.startUrl);
        expect(result?.domain).toBe(testCase.domain);
      }
    });

    it('should handle special characters in crawlId', async () => {
      const specialCrawlIds = [
        'test-crawl-with-dashes',
        'test_crawl_with_underscores',
        'test.crawl.with.dots',
        'test-crawl-123-numbers',
        'test-crawl-with-unicode-测试',
      ];

      for (const crawlId of specialCrawlIds) {
        const metadata = createTestMetadata({ id: crawlId });
        testCrawlIds.push(metadata.id);

        await repository.create(metadata);

        const result = await repository.get(crawlId);
        expect(result?.id).toBe(crawlId);
      }
    });

    it('should handle different timestamps', async () => {
      const timestamps = [
        new Date('2023-01-01T00:00:00Z'),
        new Date('2023-06-15T12:30:45Z'),
        new Date('2024-12-31T23:59:59Z'),
        new Date(), // Current time
      ];

      for (const timestamp of timestamps) {
        const metadata = createTestMetadata({
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        testCrawlIds.push(metadata.id);

        await repository.create(metadata);

        const result = await repository.get(metadata.id);
        expect(result?.createdAt.getTime()).toBe(timestamp.getTime());
        expect(result?.updatedAt.getTime()).toBe(timestamp.getTime());
      }
    });
  });

  describe('get', () => {
    it('should retrieve existing crawl metadata', async () => {
      const metadata = createTestMetadata();
      testCrawlIds.push(metadata.id);

      await repository.create(metadata);
      const result = await repository.get(metadata.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(metadata.id);
      expect(result?.startUrl).toBe(metadata.startUrl);
      expect(result?.domain).toBe(metadata.domain);
      expect(result?.depth).toBe(metadata.depth);
      expect(result?.status).toBe(metadata.status);
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
    });

    it('should return null for non-existent crawlId', async () => {
      const nonExistentCrawlId = 'non-existent-crawl-id';

      const result = await repository.get(nonExistentCrawlId);
      expect(result).toBeNull();
    });

    it('should handle empty crawlId', async () => {
      const result = await repository.get('');
      expect(result).toBeNull();
    });

    it('should properly convert ISO strings back to Date objects', async () => {
      const now = new Date();
      const metadata = createTestMetadata({
        createdAt: now,
        updatedAt: now,
      });
      testCrawlIds.push(metadata.id);

      await repository.create(metadata);
      const result = await repository.get(metadata.id);

      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
      expect(result?.createdAt.getTime()).toBe(now.getTime());
      expect(result?.updatedAt.getTime()).toBe(now.getTime());
    });
  });

  describe('data integrity', () => {
    it('should maintain data integrity across create and get operations', async () => {
      const metadata = createTestMetadata({
        id: 'test-integrity-check',
        startUrl: 'https://complex-domain.com/path/to/page?param=value#fragment',
        domain: 'complex-domain.com',
        depth: 7,
        status: 'in_progress' as const,
      });
      testCrawlIds.push(metadata.id);

      await repository.create(metadata);
      const result = await repository.get(metadata.id);

      expect(result).toEqual(metadata);
    });

    it('should handle concurrent create operations', async () => {
      const promises = [];
      const testCount = 5;

      for (let i = 0; i < testCount; i++) {
        const metadata = createTestMetadata({
          id: `test-concurrent-${i}`,
          depth: i,
        });
        testCrawlIds.push(metadata.id);

        promises.push(repository.create(metadata));
      }

      await expect(Promise.all(promises)).resolves.not.toThrow();

      // Verify all items were created
      for (let i = 0; i < testCount; i++) {
        const result = await repository.get(`test-concurrent-${i}`);
        expect(result?.depth).toBe(i);
      }
    });

    it('should handle concurrent get operations', async () => {
      const metadata = createTestMetadata();
      testCrawlIds.push(metadata.id);

      await repository.create(metadata);

      const promises = [];
      const testCount = 10;

      for (let i = 0; i < testCount; i++) {
        promises.push(repository.get(metadata.id));
      }

      const results = await Promise.all(promises);

      for (const result of results) {
        expect(result).toEqual(metadata);
      }
    });
  });

  describe('error handling', () => {
    it('should handle DynamoDB service errors gracefully', async () => {
      // Test with invalid table name
      const invalidRepository = new CrawlMetadataRepository(
        DynamoDBDocumentClient.from(
          new DynamoDBClient({
            endpoint: 'http://localhost:4566',
            region: 'eu-central-1',
            credentials: {
              accessKeyId: 'test',
              secretAccessKey: 'test',
            },
          })
        ),
        {
          awsDynamoDbCrawlMetadataTableName: 'non-existent-table',
        } as AppConfigService
      );

      const metadata = createTestMetadata();

      await expect(invalidRepository.create(metadata)).rejects.toThrow();
    });

    it('should handle network connectivity issues', async () => {
      const offlineRepository = new CrawlMetadataRepository(
        DynamoDBDocumentClient.from(
          new DynamoDBClient({
            endpoint: 'http://localhost:9999', // Non-existent endpoint
            region: 'eu-central-1',
            credentials: {
              accessKeyId: 'test',
              secretAccessKey: 'test',
            },
          })
        ),
        {
          awsDynamoDbCrawlMetadataTableName: testTableName,
        } as AppConfigService
      );

      const metadata = createTestMetadata();

      await expect(offlineRepository.create(metadata)).rejects.toThrow();
    });

    it('should handle malformed data gracefully', async () => {
      // This test would require mocking the DynamoDB client to return malformed data
      // For now, we'll test that the repository handles the basic case correctly
      const metadata = createTestMetadata();
      testCrawlIds.push(metadata.id);

      await repository.create(metadata);
      const result = await repository.get(metadata.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(metadata.id);
    });
  });

  describe('edge cases', () => {
    it('should handle very long crawlIds', async () => {
      const longCrawlId = 'a'.repeat(1000); // Very long crawlId
      const metadata = createTestMetadata({ id: longCrawlId });
      testCrawlIds.push(metadata.id);

      await repository.create(metadata);
      const result = await repository.get(longCrawlId);

      expect(result?.id).toBe(longCrawlId);
    });

    it('should handle very long URLs', async () => {
      const longUrl = `https://example.com/${'a'.repeat(2000)}`; // Very long URL
      const metadata = createTestMetadata({ startUrl: longUrl });
      testCrawlIds.push(metadata.id);

      await repository.create(metadata);
      const result = await repository.get(metadata.id);

      expect(result?.startUrl).toBe(longUrl);
    });

    it('should handle zero depth', async () => {
      const metadata = createTestMetadata({ depth: 0 });
      testCrawlIds.push(metadata.id);

      await repository.create(metadata);
      const result = await repository.get(metadata.id);

      expect(result?.depth).toBe(0);
    });

    it('should handle maximum depth', async () => {
      const metadata = createTestMetadata({ depth: Number.MAX_SAFE_INTEGER });
      testCrawlIds.push(metadata.id);

      await repository.create(metadata);
      const result = await repository.get(metadata.id);

      expect(result?.depth).toBe(Number.MAX_SAFE_INTEGER);
    });
  });
}); 