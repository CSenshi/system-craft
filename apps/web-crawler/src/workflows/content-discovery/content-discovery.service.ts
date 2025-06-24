import { Injectable } from '@nestjs/common';
import { ContentDownloaderService } from '../../services/content-downloader/content-downloader.service';
import { ContentRepository } from '../../services/content-repository/content.repository';
import { DnsResolverService } from '../../services/dns-resolver';

export type ServiceInput = {
  url: string;
};

export type ServiceResult = {
  url: string;
  resolvedIp: string;
  resolverServer: string;
  contentName: string;
  contentType: string;
};

@Injectable()
export class Service {
  constructor(
    private readonly dnsResolver: DnsResolverService,
    private readonly contentDownloader: ContentDownloaderService,
    private readonly contentRepository: ContentRepository,
  ) { }

  async discover(
    input: ServiceInput,
  ): Promise<ServiceResult> {
    // 1. Resolve DNS
    const dnsResult = await this.dnsResolver.resolveDns(
      new URL(input.url).hostname,
    );

    // 2. Download content
    const downloadResult = await this.contentDownloader.download({
      url: input.url,
      ip: dnsResult.ip,
    });

    // 3. Save content
    const contentName = this.generateContentName(input.url);
    await this.contentRepository.create({
      name: contentName,
      body: downloadResult.content,
      type: downloadResult.contentType,
    });

    return {
      url: input.url,
      resolvedIp: dnsResult.ip,
      resolverServer: dnsResult.resolverServer,
      contentName,
      contentType: downloadResult.contentType,
    };
  }

  private generateContentName(url: string): string {
    const urlObj = new URL(url);
    const timestamp = Date.now();
    const path =
      urlObj.pathname
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '') || 'index';
    return `${urlObj.hostname}_${path}_${timestamp}`;
  }
}
