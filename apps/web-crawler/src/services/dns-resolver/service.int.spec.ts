import { DnsCanNotResolveError, DnsResolver, InvalidHostnameError } from '.';

describe('UrlParserService', () => {
  let service: DnsResolver.Service;
  const dnsServers: string[] = ['1.1.1.1', '8.8.8.8'];

  beforeEach(() => {
    service = new DnsResolver.Service(dnsServers);
  });

  describe('Basic functionality', () => {
    it('should resolve DNS for a given hostname', async () => {
      expectValidIpAddress((await service.resolveDns('example.com')).ip);
    });

    it('should resolve DNS by round robin(random) DNS server', async () => {
      const hostnamesToResolve = [
        'example.com',
        'google.com',
        'github.com',
        'nodejs.org',
        'nestjs.com',
        'npmjs.com',
        'youtube.com',
      ];
      const results = await Promise.all(
        hostnamesToResolve.map((hostname) => service.resolveDns(hostname)),
      );
      results.forEach((result) => expectValidIpAddress(result.ip));

      const resolverServers = results.map((r) => r.resolverServer);
      const uniqueServers = new Set(resolverServers);
      expect(uniqueServers.size).toBeGreaterThan(1);
    });

    it('should throw an error if no IP addresses are found', async () => {
      await expect(
        service.resolveDns('nonexistent.domain.test'),
      ).rejects.toThrow(DnsCanNotResolveError);
    });

    it('should throw an error if the hostname is invalid', async () => {
      await expect(service.resolveDns('invalid host name')).rejects.toThrow(
        InvalidHostnameError,
      );
    });
  });
});

// helper function
function expectValidIpAddress(result: string): void {
  expect(result).toBeDefined();
  expect(typeof result).toBe('string');
  expect(result).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/); // Basic IPv4 format check

  const parts = result.split('.').map(Number);
  expect(parts.length).toBe(4);
  parts.forEach((part) => {
    expect(part).toBeGreaterThanOrEqual(0);
    expect(part).toBeLessThanOrEqual(255);
  });
}
