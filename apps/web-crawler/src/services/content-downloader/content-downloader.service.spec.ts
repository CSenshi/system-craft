import * as dns from 'node:dns/promises';
import { ContentDownloaderService } from './content-downloader.service';

describe('ContentDownloaderService', () => {
  let service: ContentDownloaderService;

  beforeEach(() => {
    service = new ContentDownloaderService();
  });

  describe('Basic functionality', () => {
    it('should download content from a given URL', async () => {
      const content = await service.download({
        url: 'https://example.com',
        ip: await defaultDnsLookUp('example.com'),
      });
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });

    it('should work with http URLs', async () => {
      const content = await service.download({
        url: 'http://example.com',
        ip: await defaultDnsLookUp('example.com'),
      });
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });
  });

  describe('Error handling', () => {
    it('should throw for an invalid URL', async () => {
      await expect(
        service.download({ url: 'not-a-url', ip: '127.0.0.1' }),
      ).rejects.toThrow();
    });

    it('should throw for an unreachable IP', async () => {
      await expect(
        service.download({ url: 'https://example.com', ip: '23.192.85.241' }),
      ).rejects.toThrow();
    });
  });
});

// helpers
async function defaultDnsLookUp(hostname: string): Promise<string> {
  const result = await dns.lookup(hostname);
  return result.address;
}
