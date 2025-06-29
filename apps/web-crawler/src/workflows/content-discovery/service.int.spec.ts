import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteObjectCommand,
  ListObjectsCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ContentDiscovery } from '.';
import { AppConfigService } from '../../config';
import { ContentRepository } from '../../repositories/content-repository/repository';
import { CrawlMetadataRepository } from '../../repositories/crawl-metadata-repository/repository';
import { ContentDownloader } from '../../services/content-downloader';
import { DnsResolver } from '../../services/dns-resolver';
import { ContentProcessor } from '../content-processor';
import { ContentAlreadyDiscoveredException } from './exceptions';

/**
 * Integration Test: ContentDiscovery with LocalStack S3 and Real HTTP
 *
 * This test uses LocalStack (local S3 emulator) and real HTTP requests to test
 * the service's orchestration logic with real external HTTP calls.
 *
 * Strategy:
 * - Unit tests (*.spec.ts) - Mock everything
 * - Integration tests (*.int.spec.ts) - Use LocalStack S3, real HTTP
 * - E2E tests (e2e/*) - Use real AWS S3 and real HTTP
 */
describe('ContentDiscovery Integration', () => {
  let service: ContentDiscovery.Service;
  let contentRepository: ContentRepository;
  let s3Client: S3Client;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [
        AppConfigService,
        ContentDiscovery.Service,
        {
          provide: S3Client,
          useValue: new S3Client({ forcePathStyle: true }),
        },
        {
          provide: DnsResolver.Service,
          useValue: new DnsResolver.Service(['8.8.8.8', '1.1.1.1']),
        },
        {
          provide: DynamoDBDocumentClient,
          useValue: DynamoDBDocumentClient.from(new DynamoDBClient()),
        },
        CrawlMetadataRepository,
        ContentDownloader.Service,
        ContentRepository,
        {
          provide: ContentProcessor.QueueProducer,
          useValue: {
            send: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ContentDiscovery.Service>(ContentDiscovery.Service);
    contentRepository = module.get<ContentRepository>(ContentRepository);
    s3Client = module.get<S3Client>(S3Client);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Integration Tests', () => {
    it('should discover JSON API and store in LocalStack S3', async () => {
      // Arrange
      const input: ContentDiscovery.ServiceInput = {
        url: 'https://httpbin.org/json',
        currentDepth: 0,
      };

      // Act
      const result = await service.discover(input);

      // Assert
      expect(result.url).toBe(input.url);
      expect(result.contentName).toBe('httpbin.org_json');
      expect(result.contentType).toBe('application/json');

      // Verify JSON content was stored
      const storedContent = await contentRepository.get('httpbin.org_json');
      expect(storedContent.body).toContain('"slideshow"');
      expect(storedContent.type).toBe('application/json');
    }, 30000);

    it('should handle DNS resolution for real domains', async () => {
      // Arrange
      const input: ContentDiscovery.ServiceInput = {
        url: 'https://example.com',
        currentDepth: 0,
      };

      // Act
      const result = await service.discover(input);

      // Assert
      expect(result.resolvedIp).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
      expect(result.resolverServer).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
      expect(result.contentName).toBe('example.com_index');
    }, 30000);

    it('should detect content type from URL extension', async () => {
      // Arrange
      const input: ContentDiscovery.ServiceInput = {
        url: 'https://httpbin.org/html',
        currentDepth: 0,
      };

      // Act
      const result = await service.discover(input);

      // Assert
      expect(result.contentName).toBe('httpbin.org_html');
      expect(result.contentType).toBe('text/html');

      // Verify content was stored
      const storedContent = await contentRepository.get('httpbin.org_html');
      expect(storedContent.body).toBeDefined();
      expect(storedContent.type).toBe('text/html');
    }, 30000);

    it('should handle URLs with query parameters and fragments', async () => {
      // Arrange
      const input: ContentDiscovery.ServiceInput = {
        url: 'https://httpbin.org/get?param1=value1&param2=value2#fragment',
        currentDepth: 0,
      };

      // Act
      const result = await service.discover(input);

      // Assert
      expect(result.contentName).toBe('httpbin.org_get');
      expect(result.contentType).toBe('application/json');
    }, 30000);

    it('should handle root URLs correctly', async () => {
      // Arrange
      const input: ContentDiscovery.ServiceInput = {
        url: 'https://httpbin.org',
        currentDepth: 0,
      };

      // Act
      const result = await service.discover(input);

      // Assert
      expect(result.contentName).toBe('httpbin.org_index');
      expect(result.contentType).toBe('text/html');
    }, 30000);
  });

  describe('Error Handling Integration', () => {
    it('should handle DNS resolution failures', async () => {
      // Arrange
      const input: ContentDiscovery.ServiceInput = {
        url: 'https://this-domain-definitely-does-not-exist-12345.com',
        currentDepth: 0,
      };

      // Act & Assert
      await expect(service.discover(input)).rejects.toThrow();
    }, 30000);

    it('should handle HTTP 404 errors', async () => {
      // Arrange
      const input: ContentDiscovery.ServiceInput = {
        url: 'https://httpbin.org/status/404',
        currentDepth: 0,
      };

      // Act & Assert
      await expect(service.discover(input)).rejects.toThrow();
    }, 30000);

    it('should handle S3 storage failures', async () => {
      // Arrange
      const input: ContentDiscovery.ServiceInput = {
        url: 'https://httpbin.org/html',
        currentDepth: 0,
      };

      // Mock exists to return false so the flow continues to create
      jest.spyOn(contentRepository, 'exists').mockResolvedValue(false);
      // Mock S3 to throw an error by making the repository throw
      jest
        .spyOn(contentRepository, 'create')
        .mockRejectedValue(new Error('S3 error'));

      // Act & Assert
      await expect(service.discover(input)).rejects.toThrow('S3 error');
    }, 30000);

    it('should prevent duplicate processing when content already exists in S3', async () => {
      // Arrange
      const input: ContentDiscovery.ServiceInput = {
        url: 'https://httpbin.org/json',
        currentDepth: 0,
      };

      // First, process the URL to create content in S3
      await service.discover(input);

      // Act & Assert - Try to process the same URL again
      await expect(service.discover(input)).rejects.toThrow(
        ContentAlreadyDiscoveredException,
      );
    }, 30000);

    it('should allow processing different URLs even if one already exists', async () => {
      // Arrange
      const firstInput: ContentDiscovery.ServiceInput = {
        url: 'https://httpbin.org/json',
        currentDepth: 0,
      };

      const secondInput: ContentDiscovery.ServiceInput = {
        url: 'https://httpbin.org/html',
        currentDepth: 0,
      };

      const thirdInput: ContentDiscovery.ServiceInput = {
        url: 'https://httpbin.org/get',
        currentDepth: 0,
      };

      // Process first URL
      await service.discover(firstInput);
      await service.discover(secondInput);

      // Try to process first URL again (should fail)
      await expect(service.discover(firstInput)).rejects.toThrow(
        ContentAlreadyDiscoveredException,
      );
      await expect(service.discover(secondInput)).rejects.toThrow(
        ContentAlreadyDiscoveredException,
      );

      // Process a new URL that doesn't exist yet
      await service.discover(thirdInput);
    }, 30000);
  });

  afterEach(async () => {
    // List all objects in the S3 bucket to clean up after tests
    const response = await s3Client.send(
      new ListObjectsCommand({
        Bucket: process.env.AWS_S3_CONTENT_BUCKET,
      }),
    );

    if (response.Contents) {
      for (const object of response.Contents) {
        if (object.Key) {
          // Delete each object to clean up
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: process.env.AWS_S3_CONTENT_BUCKET,
              Key: object.Key,
            }),
          );
        }
      }
    }
  });
});
