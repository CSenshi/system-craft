import { Resolver } from 'node:dns/promises';
import { DnsCanNotResolveError, InvalidHostnameError } from '.';

/**
 * Service for resolving DNS queries using a list of DNS servers
 * using round-robin selection
 */

export type DnsResolveResult = {
  ip: string;
  resolverServer: string;
};

export class DnsResolverService {
  constructor(private dnsServers: string[]) {}

  async resolveDns(hostname: string): Promise<DnsResolveResult> {
    const resolverServer = this.pickDnsServer();
    const result = await this.resolve(hostname, resolverServer);

    return { ip: result, resolverServer };
  }

  private pickDnsServer(): string {
    return this.dnsServers[Math.floor(Math.random() * this.dnsServers.length)];
  }

  private async resolve(
    hostname: string,
    resolverServer: string,
  ): Promise<string> {
    const resolver = new Resolver();
    resolver.setServers([resolverServer]);

    try {
      const res = await resolver.resolve4(hostname);
      return res[0];
    } catch (e: unknown) {
      if (this.isDnsError(e, 'EBADNAME')) {
        throw new InvalidHostnameError(hostname, e.message);
      }
      if (this.isDnsError(e, 'ENOTFOUND')) {
        throw new DnsCanNotResolveError(hostname, e.message);
      }

      throw e;
    }
  }

  private isDnsError(
    err: unknown,
    codeName?: string,
  ): err is NodeJS.ErrnoException {
    return (
      typeof err === 'object' &&
      err != null &&
      'code' in err &&
      typeof err.code === 'string' &&
      'syscall' in err &&
      typeof err.syscall === 'string' &&
      (codeName ? err.code === codeName : true)
    );
  }
}
