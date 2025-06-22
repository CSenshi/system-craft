import axios from 'axios';
import { ContentDownloaderService } from './content-downloader.service';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ContentDownloaderService', () => {
  let service: ContentDownloaderService;

  beforeEach(() => {
    service = new ContentDownloaderService();
    jest.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should download content from a given URL', async () => {
      // Arrange
      mockedAxios.get.mockResolvedValue({
        data: '<html><body>Hello World</body></html>',
        headers: { 'content-type': 'text/html' },
      });

      // Act
      const result = await service.download({
        url: 'https://example.com',
        ip: '93.184.216.34',
      });

      // Assert
      expect(result.content).toBe('<html><body>Hello World</body></html>');
      expect(result.contentType).toBe('text/html');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://93.184.216.34/',
        expect.objectContaining({
          headers: { Host: 'example.com' },
          lookup: expect.any(Function),
        })
      );
    });

    it('should work with http URLs', async () => {
      // Arrange
      mockedAxios.get.mockResolvedValue({
        data: '<html><body>Hello World</body></html>',
        headers: { 'content-type': 'text/html' },
      });

      // Act
      const result = await service.download({
        url: 'http://example.com',
        ip: '93.184.216.34',
      });

      // Assert
      expect(result.content).toBe('<html><body>Hello World</body></html>');
      expect(result.contentType).toBe('text/html');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://93.184.216.34/',
        expect.objectContaining({
          headers: { Host: 'example.com' },
          lookup: expect.any(Function),
        })
      );
    });

    it('should detect content type from URL extension when header is missing', async () => {
      // Arrange
      mockedAxios.get.mockResolvedValue({
        data: 'body { color: red; }',
        headers: {}, // No content-type header
      });

      // Act
      const result = await service.download({
        url: 'https://example.com/styles.css',
        ip: '93.184.216.34',
      });

      // Assert
      expect(result.content).toBe('body { color: red; }');
      expect(result.contentType).toBe('text/css');
    });

    it('should detect JavaScript content type from URL extension', async () => {
      // Arrange
      mockedAxios.get.mockResolvedValue({
        data: 'console.log("Hello");',
        headers: {},
      });

      // Act
      const result = await service.download({
        url: 'https://example.com/script.js',
        ip: '93.184.216.34',
      });

      // Assert
      expect(result.content).toBe('console.log("Hello");');
      expect(result.contentType).toBe('application/javascript');
    });

    it('should detect JSON content type from URL extension', async () => {
      // Arrange
      mockedAxios.get.mockResolvedValue({
        data: '{"key": "value"}',
        headers: {},
      });

      // Act
      const result = await service.download({
        url: 'https://example.com/data.json',
        ip: '93.184.216.34',
      });

      // Assert
      expect(result.content).toBe('{"key": "value"}');
      expect(result.contentType).toBe('application/json');
    });

    it('should use content-type header when available', async () => {
      // Arrange
      mockedAxios.get.mockResolvedValue({
        data: '{"key": "value"}',
        headers: { 'content-type': 'application/json; charset=utf-8' },
      });

      // Act
      const result = await service.download({
        url: 'https://example.com/api/data',
        ip: '93.184.216.34',
      });

      // Assert
      expect(result.content).toBe('{"key": "value"}');
      expect(result.contentType).toBe('application/json');
    });

    it('should default to text/html for web pages', async () => {
      // Arrange
      mockedAxios.get.mockResolvedValue({
        data: '<html><body>Hello</body></html>',
        headers: {},
      });

      // Act
      const result = await service.download({
        url: 'https://example.com',
        ip: '93.184.216.34',
      });

      // Assert
      expect(result.content).toBe('<html><body>Hello</body></html>');
      expect(result.contentType).toBe('text/html');
    });
  });

  describe('Error handling', () => {
    it('should throw for an invalid URL', async () => {
      await expect(
        service.download({ url: 'not-a-url', ip: '127.0.0.1' }),
      ).rejects.toThrow();
    });

    it('should propagate HTTP errors', async () => {
      // Arrange
      mockedAxios.get.mockRejectedValue(new Error('Request failed with status code 404'));

      // Act & Assert
      await expect(
        service.download({ url: 'https://example.com', ip: '93.184.216.34' }),
      ).rejects.toThrow('Request failed with status code 404');
    });
  });
});