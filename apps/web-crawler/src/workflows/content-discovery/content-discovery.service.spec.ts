import { Test, TestingModule } from '@nestjs/testing';
import { ContentDiscoveryService, ContentDiscoveryServiceInput } from './content-discovery.service';
import { DnsResolverService } from '../../services/dns-resolver/dns-resolver.service';
import { ContentDownloaderService, ContentDownloaderServiceOut } from '../../services/content-downloader/content-downloader.service';
import { ContentRepository } from '../../services/content-repository/content.repository';

describe('ContentDiscovery', () => {
  let service: ContentDiscoveryService;
  let dnsResolver: jest.Mocked<DnsResolverService>;
  let contentDownloader: jest.Mocked<ContentDownloaderService>;
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
        ContentDiscoveryService,
        {
          provide: DnsResolverService,
          useValue: mockDnsResolver,
        },
        {
          provide: ContentDownloaderService,
          useValue: mockContentDownloader,
        },
        {
          provide: ContentRepository,
          useValue: mockContentRepository,
        },
      ],
    }).compile();

    service = module.get<ContentDiscoveryService>(ContentDiscoveryService);
    dnsResolver = module.get(DnsResolverService);
    contentDownloader = module.get(ContentDownloaderService);
    contentRepository = module.get(ContentRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('discover', () => {
    const mockInput: ContentDiscoveryServiceInput = {
      url: 'https://example.com/page.html',
    };

    const mockDnsResult = {
      ip: '93.184.216.34',
      resolverServer: '8.8.8.8',
    };

    const mockDownloadResult: ContentDownloaderServiceOut = {
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
      const cssDownloadResult: ContentDownloaderServiceOut = {
        content: 'body { color: red; }',
        contentType: 'text/css',
      };

      const jsDownloadResult: ContentDownloaderServiceOut = {
        content: 'console.log("Hello");',
        contentType: 'application/javascript',
      };

      const jsonDownloadResult: ContentDownloaderServiceOut = {
        content: '{"key": "value"}',
        contentType: 'application/json',
      };

      dnsResolver.resolveDns.mockResolvedValue(mockDnsResult);
      contentRepository.create.mockResolvedValue(undefined);

      // Act & Assert
      contentDownloader.download.mockResolvedValue(cssDownloadResult);
      const cssResult = await service.discover({ url: 'https://example.com/styles.css' });
      expect(cssResult.contentType).toBe('text/css');

      contentDownloader.download.mockResolvedValue(jsDownloadResult);
      const jsResult = await service.discover({ url: 'https://example.com/script.js' });
      expect(jsResult.contentType).toBe('application/javascript');

      contentDownloader.download.mockResolvedValue(jsonDownloadResult);
      const jsonResult = await service.discover({ url: 'https://example.com/data.json' });
      expect(jsonResult.contentType).toBe('application/json');
    });

    it('should handle URLs with no pathname', async () => {
      // Arrange
      const rootInput: ContentDiscoveryServiceInput = {
        url: 'https://example.com',
      };

      dnsResolver.resolveDns.mockResolvedValue(mockDnsResult);
      contentDownloader.download.mockResolvedValue(mockDownloadResult);
      contentRepository.create.mockResolvedValue(undefined);

      // Act
      const result = await service.discover(rootInput);

      // Assert
      expect(contentRepository.create).toHaveBeenCalledWith({
        name: 'example.com_index_1640995200000',
        body: mockDownloadResult.content,
        type: mockDownloadResult.contentType,
      });
    });

    it('should handle URLs with special characters in pathname', async () => {
      // Arrange
      const specialInput: ContentDiscoveryServiceInput = {
        url: 'https://example.com/path/with/special-chars!@#$%^&*()',
      };

      dnsResolver.resolveDns.mockResolvedValue(mockDnsResult);
      contentDownloader.download.mockResolvedValue(mockDownloadResult);
      contentRepository.create.mockResolvedValue(undefined);

      // Act
      const result = await service.discover(specialInput);

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
      await expect(service.discover(mockInput)).rejects.toThrow('DNS resolution failed');
      expect(contentDownloader.download).not.toHaveBeenCalled();
      expect(contentRepository.create).not.toHaveBeenCalled();
    });

    it('should propagate content download errors', async () => {
      // Arrange
      const downloadError = new Error('Download failed');
      dnsResolver.resolveDns.mockResolvedValue(mockDnsResult);
      contentDownloader.download.mockRejectedValue(downloadError);

      // Act & Assert
      await expect(service.discover(mockInput)).rejects.toThrow('Download failed');
      expect(contentRepository.create).not.toHaveBeenCalled();
    });

    it('should propagate content repository errors', async () => {
      // Arrange
      const repositoryError = new Error('Repository error');
      dnsResolver.resolveDns.mockResolvedValue(mockDnsResult);
      contentDownloader.download.mockResolvedValue(mockDownloadResult);
      contentRepository.create.mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(service.discover(mockInput)).rejects.toThrow('Repository error');
    });
  });
}); 