import { Test, TestingModule } from '@nestjs/testing';
import {
  DeleteObjectCommand,
  ListObjectsCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { ContentDownloaderService } from '../../services/content-downloader/content-downloader.service';
import { ContentRepository } from '../../services/content-repository/content.repository';
import { DnsResolverService } from '../../services/dns-resolver/dns-resolver.service';
import {
  ContentDiscoveryService,
  ContentDiscoveryServiceInput,
} from './content-discovery.service';

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
  let service: ContentDiscoveryService;
  let contentRepository: ContentRepository;
  let s3Client: S3Client;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentDiscoveryService,
        {
          provide: S3Client,
          useValue: new S3Client({ forcePathStyle: true }),
        },
        {
          provide: DnsResolverService,
          useValue: new DnsResolverService(['8.8.8.8', '1.1.1.1']),
        },
        ContentDownloaderService,
        ContentRepository,
      ],
    }).compile();

    service = module.get<ContentDiscoveryService>(ContentDiscoveryService);
    contentRepository = module.get<ContentRepository>(ContentRepository);
    s3Client = module.get<S3Client>(S3Client);

    // Mock Date.now() to return a fixed timestamp
    jest.spyOn(Date, 'now').mockReturnValue(1640995200000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Integration Tests', () => {
    it('should discover JSON API and store in LocalStack S3', async () => {
      // Arrange
      const input: ContentDiscoveryServiceInput = {
        url: 'https://httpbin.org/json',
      };

      // Act
      const result = await service.discover(input);

      // Assert
      expect(result.url).toBe(input.url);
      expect(result.contentName).toBe('httpbin.org_json_1640995200000');
      expect(result.contentType).toBe('application/json');

      // Verify JSON content was stored
      const storedContent = await contentRepository.get(
        'httpbin.org_json_1640995200000',
      );
      expect(storedContent.body).toContain('"slideshow"');
      expect(storedContent.type).toBe('application/json');
    }, 30000);

    it('should handle DNS resolution for real domains', async () => {
      // Arrange
      const input: ContentDiscoveryServiceInput = {
        url: 'https://example.com',
      };

      // Act
      const result = await service.discover(input);

      // Assert
      expect(result.resolvedIp).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
      expect(result.resolverServer).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
      expect(result.contentName).toBe('example.com_index_1640995200000');
    }, 30000);

    it('should detect content type from URL extension', async () => {
      // Arrange
      const input: ContentDiscoveryServiceInput = {
        url: 'https://httpbin.org/html',
      };

      // Act
      const result = await service.discover(input);

      // Assert
      expect(result.contentName).toBe('httpbin.org_html_1640995200000');
      expect(result.contentType).toBe('text/html');

      // Verify content was stored
      const storedContent = await contentRepository.get(
        'httpbin.org_html_1640995200000',
      );
      expect(storedContent.body).toBeDefined();
      expect(storedContent.type).toBe('text/html');
    }, 30000);

    it('should handle URLs with query parameters and fragments', async () => {
      // Arrange
      const input: ContentDiscoveryServiceInput = {
        url: 'https://httpbin.org/get?param1=value1&param2=value2#fragment',
      };

      // Act
      const result = await service.discover(input);

      // Assert
      expect(result.contentName).toBe('httpbin.org_get_1640995200000');
      expect(result.contentType).toBe('application/json');
    }, 30000);

    it('should handle root URLs correctly', async () => {
      // Arrange
      const input: ContentDiscoveryServiceInput = {
        url: 'https://httpbin.org',
      };

      // Act
      const result = await service.discover(input);

      // Assert
      expect(result.contentName).toBe('httpbin.org_index_1640995200000');
      expect(result.contentType).toBe('text/html');
    }, 30000);
  });

  describe('Error Handling Integration', () => {
    it('should handle DNS resolution failures', async () => {
      // Arrange
      const input: ContentDiscoveryServiceInput = {
        url: 'https://this-domain-definitely-does-not-exist-12345.com',
      };

      // Act & Assert
      await expect(service.discover(input)).rejects.toThrow();
    }, 30000);

    it('should handle HTTP 404 errors', async () => {
      // Arrange
      const input: ContentDiscoveryServiceInput = {
        url: 'https://httpbin.org/status/404',
      };

      // Act & Assert
      await expect(service.discover(input)).rejects.toThrow();
    }, 30000);

    it('should handle S3 storage failures', async () => {
      // Arrange
      const input: ContentDiscoveryServiceInput = {
        url: 'https://httpbin.org/html',
      };

      // Mock S3 to throw an error by making the repository throw
      jest
        .spyOn(contentRepository, 'create')
        .mockRejectedValue(new Error('S3 error'));

      // Act & Assert
      await expect(service.discover(input)).rejects.toThrow('S3 error');
    }, 30000);
  });

  afterAll(async () => {
    // List all objects in the S3 bucket to clean up after tests
    console.log('Cleaning up S3 bucket...');

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

      console.log('S3 bucket cleanup completed.');
    }
  });
});
