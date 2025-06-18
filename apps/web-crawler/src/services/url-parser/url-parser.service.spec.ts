import { Command, UrlParserService } from './url-parser.service';

describe('UrlParserService', () => {
  let service: UrlParserService;

  beforeEach(() => {
    service = new UrlParserService();
  });

  describe('Basic functionality', () => {
    it('should obfuscate and deobfuscate the same id', async () => {
      await service.execute(
        new Command({
          url: 'https://example.com/',
        }),
      );
    });
  });
});

// input: URL
//
