import { Injectable } from '@nestjs/common';
import { ContentRepository } from '../../repositories/content-repository/repository';
import { ContentDownloader } from '../../services/content-downloader';
import { DnsResolver } from '../../services/dns-resolver';
import { QueueProducer } from '../content-processor';
import { CrawlMetadata, CrawlMetadataRepository } from '../../repositories/crawl-metadata-repository/repository';
import { randomUUID } from 'crypto';
import { ContentAlreadyDiscoveredException } from './exceptions';

export type ServiceInput = {
  url: string;
  currentDepth: number;
  crawlId?: string;
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
    private readonly dnsResolver: DnsResolver.Service,
    private readonly contentDownloader: ContentDownloader.Service,
    private readonly contentRepository: ContentRepository,
    private readonly crawlMetadataRepository: CrawlMetadataRepository,
    private readonly contentProcessorQueueProducer: QueueProducer,
  ) { }

  async discover(input: ServiceInput): Promise<ServiceResult> {
    // 1. Check if url is already processed
    if (await this.contentRepository.exists(this.generateContentName(input.url))) {
      throw new ContentAlreadyDiscoveredException(input.url);
    }

    // 2. Get or Create Crawl Metadata
    const metadata = await this.getOrCreateCrawlMetadata(input);

    // 3. Resolve DNS
    const dnsResult = await this.dnsResolver.resolveDns(
      new URL(input.url).hostname,
    );

    // 4. Download content
    const downloadResult = await this.contentDownloader.download({
      url: input.url,
      ip: dnsResult.ip,
    });

    // 5. Save content
    const contentName = this.generateContentName(input.url);
    await this.contentRepository.create({
      name: contentName,
      body: downloadResult.content,
      type: downloadResult.contentType,
    });

    // 6. Process content
    if (input.currentDepth > 0) {
      await this.contentProcessorQueueProducer.send({
        contentName,
        aux: {
          depth: input.currentDepth,
          crawlId: metadata.id,
        },
      });
    }

    return {
      url: input.url,
      resolvedIp: dnsResult.ip,
      resolverServer: dnsResult.resolverServer,
      contentName,
      contentType: downloadResult.contentType,
    };
  }

  async getOrCreateCrawlMetadata(input: ServiceInput): Promise<CrawlMetadata> {
    if (input.crawlId) {
      const metadata = await this.crawlMetadataRepository.get(input.crawlId);
      if (!metadata) {
        throw new Error(`Crawl metadata with ID ${input.crawlId} not found`);
      }
      return metadata;
    }

    const newMetadata: CrawlMetadata = {
      id: randomUUID(),
      status: 'in_progress',
      startUrl: input.url,
      domain: new URL(input.url).hostname,
      protocol: new URL(input.url).protocol.replace(':', ''),
      depth: input.currentDepth,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.crawlMetadataRepository.create(newMetadata);
    return newMetadata;
  }

  private generateContentName(url: string): string {
    const urlObj = new URL(url);
    const path =
      urlObj.pathname
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '') || 'index';
    return `${urlObj.hostname}_${path}`;
  }
}
