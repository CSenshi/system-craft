import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SqsModule } from '@ssut/nestjs-sqs';
import { ContentRepository } from '../../repositories/content-repository/repository';
import { Service } from '../../services/url-extractor/service';
import { ContentProcessor } from '.';
import { ContentDiscovery } from '../content-discovery';

/**
 * Integration Test: ContentProcessing with LocalStack S3 and Real URL Extraction
 *
 * This test uses LocalStack (local S3 emulator) and real URL extraction to test
 * the service's orchestration logic with real content processing.
 *
 * Strategy:
 * - Unit tests (*.spec.ts) - Mock everything
 * - Integration tests (*.int.spec.ts) - Use LocalStack S3, real URL extraction
 * - E2E tests (e2e/*) - Use real AWS S3 and real processing
 */
describe('ContentProcessing Integration', () => {
  let service: ContentProcessor.Service;
  let contentRepository: ContentRepository;
  let s3Client: S3Client;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        await ConfigModule.forRoot({ isGlobal: true }),
        SqsModule.registerAsync({
          inject: [ConfigService],
          useFactory: (cfg: ConfigService) => {
            const opts = [
              {
                name: cfg.getOrThrow('AWS_SQS_CONTENT_DISCOVERY_QUEUE_NAME'),
                queueUrl: cfg.getOrThrow('AWS_SQS_CONTENT_DISCOVERY_QUEUE_URL'),
              },
              {
                name: cfg.getOrThrow('AWS_SQS_CONTENT_PROCESSING_QUEUE_NAME'),
                queueUrl: cfg.getOrThrow(
                  'AWS_SQS_CONTENT_PROCESSING_QUEUE_URL',
                ),
              },
            ];

            return { consumers: opts, producers: opts };
          },
        }),
      ],
      providers: [
        ContentProcessor.Service,
        {
          provide: S3Client,
          useValue: new S3Client({ forcePathStyle: true }),
        },
        ContentRepository,
        Service,
        {
          provide: ContentDiscovery.QueueProducer,
          useValue: {
            send: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ContentProcessor.Service>(ContentProcessor.Service);
    contentRepository = module.get<ContentRepository>(ContentRepository);
    s3Client = module.get<S3Client>(S3Client);
  });

  describe('Integration Tests', () => {
    it('should process HTML content and extract URLs', async () => {
      // Arrange
      const contentName = 'test-html-content';
      const htmlContent = `
        <html>
          <body>
            <a href="https://example.com/link1">Link 1</a>
            <a href="https://test.com/link2">Link 2</a>
            <img src="https://example.com/image.jpg" />
            <script src="https://cdn.com/script.js"></script>
            <link href="https://cdn.com/style.css" rel="stylesheet" />
          </body>
        </html>
      `;

      // Store content in S3
      await contentRepository.create({
        name: contentName,
        body: htmlContent,
        type: 'text/html',
      });

      const input: ContentProcessor.ServiceInput = {
        contentName,
        currentDepth: 0,
      };

      // Act
      const result = await service.process(input);

      // Assert
      expect(result.contentName).toBe(contentName);
      expect(result.extractedUrls).toContain('https://example.com/link1');
      expect(result.extractedUrls).toContain('https://test.com/link2');
      expect(result.extractedUrls).toContain('https://example.com/image.jpg');
      expect(result.extractedUrls).toContain('https://cdn.com/script.js');
      expect(result.extractedUrls).toContain('https://cdn.com/style.css');
    }, 30000);

    it('should process text content and extract URLs', async () => {
      // Arrange
      const contentName = 'test-text-content';
      const textContent = `
        Check out these links:
        https://example.com/page1
        https://test.com/page2
        Also visit http://another.com/page3
      `;

      // Store content in S3
      await contentRepository.create({
        name: contentName,
        body: textContent,
        type: 'text/plain',
      });

      const input: ContentProcessor.ServiceInput = {
        contentName,
        currentDepth: 0,
      };

      // Act
      const result = await service.process(input);

      // Assert
      expect(result.contentName).toBe(contentName);
      expect(result.extractedUrls).toContain('https://example.com/page1');
      expect(result.extractedUrls).toContain('https://test.com/page2');
      expect(result.extractedUrls).toContain('http://another.com/page3');
    }, 30000);

    it('should filter out relative URLs and invalid URLs', async () => {
      // Arrange
      const contentName = 'test-mixed-urls';
      const mixedContent = `
        <html>
          <body>
            <a href="https://example.com/valid">Valid</a>
            <a href="/relative/path">Relative</a>
            <a href="./another-relative">Another Relative</a>
            <a href="ftp://example.com/ftp">FTP</a>
            <a href="mailto:test@example.com">Email</a>
            <a href="https://test.com/also-valid">Also Valid</a>
          </body>
        </html>
      `;

      // Store content in S3
      await contentRepository.create({
        name: contentName,
        body: mixedContent,
        type: 'text/html',
      });

      const input: ContentProcessor.ServiceInput = {
        contentName,
        currentDepth: 0,
      };

      // Act
      const result = await service.process(input);

      // Assert
      expect(result.extractedUrls).toContain('https://example.com/valid');
      expect(result.extractedUrls).toContain('https://test.com/also-valid');
      expect(result.extractedUrls).toContain('/relative/path');
      expect(result.extractedUrls).toContain('./another-relative');
      expect(result.extractedUrls).toContain('ftp://example.com/ftp');
      expect(result.extractedUrls).toContain('mailto:test@example.com');

      // But only valid HTTP/HTTPS URLs should be queued
    }, 30000);

    it('should handle content with no URLs', async () => {
      // Arrange
      const contentName = 'test-no-urls';
      const noUrlsContent = `
        <html>
          <body>
            <h1>No links here</h1>
            <p>Just some text content without any URLs.</p>
          </body>
        </html>
      `;

      // Store content in S3
      await contentRepository.create({
        name: contentName,
        body: noUrlsContent,
        type: 'text/html',
      });

      const input: ContentProcessor.ServiceInput = {
        contentName,
        currentDepth: 0,
      };

      // Act
      const result = await service.process(input);

      // Assert
      expect(result.contentName).toBe(contentName);
      expect(result.extractedUrls).toEqual([]);
    }, 30000);

    it('should handle undefined content type as text', async () => {
      // Arrange
      const contentName = 'test-undefined-type';
      const textContent = 'Check out https://example.com and https://test.com';

      // Store content in S3 without content type
      await contentRepository.create({
        name: contentName,
        body: textContent,
        type: undefined as any,
      });

      const input: ContentProcessor.ServiceInput = {
        contentName,
        currentDepth: 0,
      };

      // Act
      const result = await service.process(input);

      // Assert
      expect(result.extractedUrls).toContain('https://example.com');
      expect(result.extractedUrls).toContain('https://test.com');
    }, 30000);
  });

  describe('Error Handling Integration', () => {
    it('should handle content not found in S3', async () => {
      // Arrange
      const input: ContentProcessor.ServiceInput = {
        contentName: 'non-existent-content',
        currentDepth: 0,
      };

      // Act & Assert
      await expect(service.process(input)).rejects.toThrow();
    }, 30000);

    it('should continue processing when some URLs fail to queue', async () => {
      // Arrange
      const contentName = 'test-queue-failures';
      const content = `
        <html>
          <body>
            <a href="https://example.com/1">Link 1</a>
            <a href="https://example.com/2">Link 2</a>
            <a href="https://example.com/3">Link 3</a>
          </body>
        </html>
      `;

      // Store content in S3
      await contentRepository.create({
        name: contentName,
        body: content,
        type: 'text/html',
      });

      const input: ContentProcessor.ServiceInput = {
        contentName,
        currentDepth: 0,
      };

      // Act
      await service.process(input);

      // Assert
    }, 30000);
  });

  afterAll(async () => {
    // Clean up test objects from S3
    const testContentNames = [
      'test-html-content',
      'test-text-content',
      'test-mixed-urls',
      'test-no-urls',
      'test-undefined-type',
      'test-queue-failures',
    ];

    for (const contentName of testContentNames) {
      try {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_CONTENT_BUCKET,
            Key: contentName,
          }),
        );
      } catch (error) {
        // Ignore errors for non-existent objects
      }
    }
  });
});
