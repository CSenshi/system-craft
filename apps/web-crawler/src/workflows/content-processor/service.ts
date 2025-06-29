import { Injectable } from '@nestjs/common';
import { ContentRepository } from '../../repositories/content-repository/repository';
import { CrawlMetadataRepository } from '../../repositories/crawl-metadata-repository/repository';
import { UrlExtractor } from '../../services/url-extractor';
import { QueueProducer } from '../content-discovery';

export type ServiceInput = {
  crawlId: string;
  contentName: string; // S3 object key/name
  currentDepth: number; // Current depth in the crawl
};

export type ServiceOutput = {
  contentName: string;
  extractedUrls: string[];
};

@Injectable()
export class Service {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly crawlMetadataRepository: CrawlMetadataRepository,
    private readonly urlExtractor: UrlExtractor.Service,
    private readonly contentDiscoveryQueueProducer: QueueProducer,
  ) {}

  async process(input: ServiceInput): Promise<ServiceOutput> {
    // 1. Get crawl metadata
    const metadata = await this.crawlMetadataRepository.get(input.crawlId);
    if (!metadata) {
      throw new Error(`Crawl metadata with ID ${input.crawlId} not found`);
    }

    // 1. Retrieve content from S3 repository
    const content = await this.contentRepository.get(input.contentName);

    // 2. Extract URLs from content
    const extractedUrls = this.urlExtractor.extractUrls({
      content: content.body,
      type: this.determineContentType(content.type),
      domain: metadata.domain,
      protocol: metadata.protocol,
    });

    // 3. Push discovered URLs to content-discovery queue
    await Promise.all(
      extractedUrls.map((url) =>
        this.contentDiscoveryQueueProducer.send({
          url,
          depth: input.currentDepth - 1, // Decrease depth for next discovery
        }),
      ),
    );

    return {
      contentName: input.contentName,
      extractedUrls,
    };
  }

  private determineContentType(
    contentType: string | undefined,
  ): 'html' | 'text' {
    if (!contentType) return 'text';

    const htmlTypes = ['text/html'];
    return htmlTypes.includes(contentType) ? 'html' : 'text';
  }
}
