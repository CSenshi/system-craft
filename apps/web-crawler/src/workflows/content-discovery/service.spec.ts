import { Test, TestingModule } from '@nestjs/testing';
import { ContentDiscovery } from '.';
import { ContentRepository } from '../../repositories/content-repository/repository';
import { ContentDownloader } from '../../services/content-downloader';
import { DnsResolver } from '../../services/dns-resolver';
import { ContentProcessor } from '../content-processor';
import { CrawlMetadataRepository } from '../../repositories/crawl-metadata-repository/repository';


describe('ContentDiscovery', () => {
  let service: ContentDiscovery.Service;
  let dnsResolver: jest.Mocked<DnsResolver.Service>;
  let contentDownloader: jest.Mocked<ContentDownloader.Service>;
  let contentRepository: jest.Mocked<ContentRepository>;

  beforeEach(async () => {
    const mockDnsResolver = {
      resolveDns: jest.fn(),
    };

    const mockContentDownloader = {
      download: jest.fn(),
    };

    const mockContentRepository = {
      create: jest.fn(),
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentDiscovery.Service,
        {
          provide: DnsResolver.Service,
          useValue: mockDnsResolver,
        },
        {
          provide: ContentDownloader.Service,
          useValue: mockContentDownloader,
        },
        {
          provide: ContentRepository,
          useValue: mockContentRepository,
        },
        {
          provide: ContentProcessor.QueueProducer,
          useValue: {
            send: jest.fn(),
          },
        },
        {
          provide: CrawlMetadataRepository,
          useValue: {
            create: jest.fn(),
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ContentDiscovery.Service>(ContentDiscovery.Service);
    dnsResolver = module.get(DnsResolver.Service);
    contentDownloader = module.get(ContentDownloader.Service);
    contentRepository = module.get(ContentRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('discover', () => {
    const mockInput: ContentDiscovery.ServiceInput = {
      url: 'https://example.com/page.html',
      currentDepth: 0,
    };

    const mockDnsResult = {
      ip: '93.184.216.34',
      resolverServer: '8.8.8.8',
    };

    const mockDownloadResult: ContentDownloader.Output = {
      content: '<html><body>Hello World</body></html>',
      contentType: 'text/html',
    };

    beforeEach(() => {
      jest.clearAllMocks();

      // Mock Date.now() to return a fixed timestamp
      jest.spyOn(Date, 'now').mockReturnValue(1640995200000); // 2022-01-01 00:00:00 UTC
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should successfully discover a URL with content type from downloader', async () => {
      // Arrange
      dnsResolver.resolveDns.mockResolvedValue(mockDnsResult);
      contentDownloader.download.mockResolvedValue(mockDownloadResult);
      contentRepository.create.mockResolvedValue(undefined);

      // Act
      const result = await service.discover(mockInput);

      // Assert
      expect(dnsResolver.resolveDns).toHaveBeenCalledWith('example.com');
      expect(contentDownloader.download).toHaveBeenCalledWith({
        url: mockInput.url,
        ip: mockDnsResult.ip,
      });
      expect(contentRepository.create).toHaveBeenCalledWith({
        name: 'example.com_page_html_1640995200000',
        body: mockDownloadResult.content,
        type: mockDownloadResult.contentType,
      });

      expect(result).toEqual({
        url: mockInput.url,
        resolvedIp: mockDnsResult.ip,
        resolverServer: mockDnsResult.resolverServer,
        contentName: 'example.com_page_html_1640995200000',
        contentType: mockDownloadResult.contentType,
      });
    });

    it('should handle different content types from downloader', async () => {
      // Arrange
      const cssDownloadResult: ContentDownloader.Output = {
        content: 'body { color: red; }',
        contentType: 'text/css',
      };

      const jsDownloadResult: ContentDownloader.Output = {
        content: 'console.log("Hello");',
        contentType: 'application/javascript',
      };

      const jsonDownloadResult: ContentDownloader.Output = {
        content: '{"key": "value"}',
        contentType: 'application/json',
      };

      dnsResolver.resolveDns.mockResolvedValue(mockDnsResult);
      contentRepository.create.mockResolvedValue(undefined);

      // Act & Assert
      contentDownloader.download.mockResolvedValue(cssDownloadResult);
      const cssResult = await service.discover({
        url: 'https://example.com/styles.css',
        currentDepth: 0
      });
      expect(cssResult.contentType).toBe('text/css');

      contentDownloader.download.mockResolvedValue(jsDownloadResult);
      const jsResult = await service.discover({
        url: 'https://example.com/script.js',
        currentDepth: 0
      });
      expect(jsResult.contentType).toBe('application/javascript');

      contentDownloader.download.mockResolvedValue(jsonDownloadResult);
      const jsonResult = await service.discover({
        url: 'https://example.com/data.json',
        currentDepth: 0
      });
      expect(jsonResult.contentType).toBe('application/json');
    });

    it('should handle URLs with no pathname', async () => {
      // Arrange
      const rootInput: ContentDiscovery.ServiceInput = {
        url: 'https://example.com',
        currentDepth: 0,
      };

      dnsResolver.resolveDns.mockResolvedValue(mockDnsResult);
      contentDownloader.download.mockResolvedValue(mockDownloadResult);
      contentRepository.create.mockResolvedValue(undefined);

      // Act
      await service.discover(rootInput);

      // Assert
      expect(contentRepository.create).toHaveBeenCalledWith({
        name: 'example.com_index_1640995200000',
        body: mockDownloadResult.content,
        type: mockDownloadResult.contentType,
      });
    });

    it('should handle URLs with special characters in pathname', async () => {
      // Arrange
      const specialInput: ContentDiscovery.ServiceInput = {
        url: 'https://example.com/path/with/special-chars!@#$%^&*()',
        currentDepth: 0,
      };

      dnsResolver.resolveDns.mockResolvedValue(mockDnsResult);
      contentDownloader.download.mockResolvedValue(mockDownloadResult);
      contentRepository.create.mockResolvedValue(undefined);

      // Act
      await service.discover(specialInput);

      // Assert
      expect(contentRepository.create).toHaveBeenCalledWith({
        name: 'example.com_path_with_special_chars_1640995200000',
        body: mockDownloadResult.content,
        type: mockDownloadResult.contentType,
      });
    });

    it('should propagate DNS resolution errors', async () => {
      // Arrange
      const dnsError = new Error('DNS resolution failed');
      dnsResolver.resolveDns.mockRejectedValue(dnsError);

      // Act & Assert
      await expect(service.discover(mockInput)).rejects.toThrow(
        'DNS resolution failed',
      );
      expect(contentDownloader.download).not.toHaveBeenCalled();
      expect(contentRepository.create).not.toHaveBeenCalled();
    });

    it('should propagate content download errors', async () => {
      // Arrange
      const downloadError = new Error('Download failed');
      dnsResolver.resolveDns.mockResolvedValue(mockDnsResult);
      contentDownloader.download.mockRejectedValue(downloadError);

      // Act & Assert
      await expect(service.discover(mockInput)).rejects.toThrow(
        'Download failed',
      );
      expect(contentRepository.create).not.toHaveBeenCalled();
    });

    it('should propagate content repository errors', async () => {
      // Arrange
      const repositoryError = new Error('Repository error');
      dnsResolver.resolveDns.mockResolvedValue(mockDnsResult);
      contentDownloader.download.mockResolvedValue(mockDownloadResult);
      contentRepository.create.mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(service.discover(mockInput)).rejects.toThrow(
        'Repository error',
      );
    });
  });
});
