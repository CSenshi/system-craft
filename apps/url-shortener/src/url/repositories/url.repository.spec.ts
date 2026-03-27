import { UrlNotFoundExceptions } from '../exceptions/url.exceptions';
import { UrlRepository } from './url.repository';

describe('UrlRepository', () => {
  let repository: UrlRepository;
  let prisma: {
    shortendUrls: {
      create: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      shortendUrls: {
        create: jest.fn().mockResolvedValue(undefined),
        findUnique: jest.fn(),
      },
    };

    repository = new UrlRepository(prisma as any);
  });

  describe('saveUrlMapping', () => {
    it('should call prisma.shortendUrls.create with id and url', async () => {
      await repository.saveUrlMapping(42, 'https://example.com');

      expect(prisma.shortendUrls.create).toHaveBeenCalledWith({
        data: { id: 42, url: 'https://example.com' },
      });
    });
  });

  describe('getUrlById', () => {
    it('should return url when record exists', async () => {
      prisma.shortendUrls.findUnique.mockResolvedValue({
        url: 'https://example.com',
      });

      const result = await repository.getUrlById(42);

      expect(result).toBe('https://example.com');
    });

    it('should query with correct where and select', async () => {
      prisma.shortendUrls.findUnique.mockResolvedValue({
        url: 'https://example.com',
      });

      await repository.getUrlById(42);

      expect(prisma.shortendUrls.findUnique).toHaveBeenCalledWith({
        where: { id: 42 },
        select: { url: true },
      });
    });

    it('should throw UrlNotFoundExceptions when record not found', async () => {
      prisma.shortendUrls.findUnique.mockResolvedValue(null);

      await expect(repository.getUrlById(999)).rejects.toThrow(
        UrlNotFoundExceptions,
      );
    });
  });
});
