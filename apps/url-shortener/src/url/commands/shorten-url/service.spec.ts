import { ConfigService } from '@nestjs/config';
import { CounterService } from '../../../counter/counter.service';
import { IdObfuscatorService } from '../../app-services/id-obfuscator.service';
import { NumberHasherService } from '../../app-services/number-hasher.service';
import { UrlRepository } from '../../repositories/url.repository';
import { Command, CommandOutput, Service } from './service';

describe('ShortenUrl.Service', () => {
  let service: Service;
  let counterService: jest.Mocked<CounterService>;
  let idObfuscatorService: jest.Mocked<IdObfuscatorService>;
  let numberHasherService: jest.Mocked<NumberHasherService>;
  let urlRepository: jest.Mocked<UrlRepository>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    counterService = {
      getNextCount: jest.fn().mockResolvedValue(42),
    } as any;

    idObfuscatorService = {
      obfuscate: jest.fn().mockReturnValue(987654),
    } as any;

    numberHasherService = {
      encode: jest.fn().mockReturnValue('aBcDeFg'),
    } as any;

    urlRepository = {
      saveUrlMapping: jest.fn().mockResolvedValue(undefined),
    } as any;

    configService = {
      get: jest.fn().mockReturnValue('https://short.url'),
    } as any;

    service = new Service(
      counterService,
      idObfuscatorService,
      numberHasherService,
      urlRepository,
      configService,
    );
  });

  describe('execute', () => {
    const cmd = new Command({ url: 'https://example.com/long-url' });

    it('should get next counter value', async () => {
      await service.execute(cmd);

      expect(counterService.getNextCount).toHaveBeenCalled();
    });

    it('should obfuscate the counter value', async () => {
      await service.execute(cmd);

      expect(idObfuscatorService.obfuscate).toHaveBeenCalledWith(42);
    });

    it('should encode the obfuscated ID with length 7', async () => {
      await service.execute(cmd);

      expect(numberHasherService.encode).toHaveBeenCalledWith(987654, 7);
    });

    it('should save mapping with original counter ID and input URL', async () => {
      await service.execute(cmd);

      expect(urlRepository.saveUrlMapping).toHaveBeenCalledWith(
        42,
        'https://example.com/long-url',
      );
    });

    it('should return CommandOutput with full short URL', async () => {
      const result = await service.execute(cmd);

      expect(result).toBeInstanceOf(CommandOutput);
      expect(result.shortUrl).toBe('https://short.url/l/aBcDeFg');
    });

    it('should use SHORTENER_BASE_URL from config', async () => {
      await service.execute(cmd);

      expect(configService.get).toHaveBeenCalledWith(
        'SHORTENER_BASE_URL',
        'http://localhost:3000',
      );
    });

    it('should propagate counter service errors', async () => {
      counterService.getNextCount.mockRejectedValue(
        new Error('Redis connection failed'),
      );

      await expect(service.execute(cmd)).rejects.toThrow(
        'Redis connection failed',
      );
    });

    it('should propagate repository errors', async () => {
      urlRepository.saveUrlMapping.mockRejectedValue(
        new Error('Unique constraint violation'),
      );

      await expect(service.execute(cmd)).rejects.toThrow(
        'Unique constraint violation',
      );
    });
  });
});
