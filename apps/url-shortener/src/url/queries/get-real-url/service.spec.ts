import { IdObfuscatorService } from '../../app-services/id-obfuscator.service';
import { NumberHasherService } from '../../app-services/number-hasher.service';
import { UrlNotFoundExceptions } from '../../exceptions/url.exceptions';
import { UrlRepository } from '../../repositories/url.repository';
import { Query, QueryOutput, Service } from './service';

describe('GetRealUrl.Service', () => {
  let service: Service;
  let idObfuscatorService: jest.Mocked<IdObfuscatorService>;
  let numberHasherService: jest.Mocked<NumberHasherService>;
  let urlRepository: jest.Mocked<UrlRepository>;

  beforeEach(() => {
    numberHasherService = {
      decode: jest.fn().mockReturnValue(987654),
    } as any;

    idObfuscatorService = {
      deobfuscate: jest.fn().mockReturnValue(42),
    } as any;

    urlRepository = {
      getUrlById: jest.fn().mockResolvedValue('https://example.com/long-url'),
    } as any;

    service = new Service(
      idObfuscatorService,
      numberHasherService,
      urlRepository,
    );
  });

  describe('execute', () => {
    const query = new Query({ shortUrlId: 'aBcDeFg' });

    it('should decode the short URL ID', async () => {
      await service.execute(query);

      expect(numberHasherService.decode).toHaveBeenCalledWith('aBcDeFg');
    });

    it('should deobfuscate the decoded numeric ID', async () => {
      await service.execute(query);

      expect(idObfuscatorService.deobfuscate).toHaveBeenCalledWith(987654);
    });

    it('should look up URL by deobfuscated ID', async () => {
      await service.execute(query);

      expect(urlRepository.getUrlById).toHaveBeenCalledWith(42);
    });

    it('should return QueryOutput with the resolved URL', async () => {
      const result = await service.execute(query);

      expect(result).toBeInstanceOf(QueryOutput);
      expect(result.url).toBe('https://example.com/long-url');
    });

    it('should propagate UrlNotFoundExceptions from repository', async () => {
      urlRepository.getUrlById.mockRejectedValue(new UrlNotFoundExceptions());

      await expect(service.execute(query)).rejects.toThrow(
        UrlNotFoundExceptions,
      );
    });

    it('should propagate decode errors from NumberHasherService', async () => {
      numberHasherService.decode.mockImplementation(() => {
        throw new Error('Invalid character');
      });

      await expect(service.execute(query)).rejects.toThrow('Invalid character');
    });
  });
});
