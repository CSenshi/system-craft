import { Injectable } from '@nestjs/common';
import { ContentRepository } from '../../repositories/content-repository/repository';
import { UrlExtractor } from '../../services/url-extractor';
import { QueueProducer } from '../content-discovery';

export type ServiceInput = {
  contentName: string; // S3 object key/name
};

export type ServiceOutput = {
  contentName: string;
  extractedUrls: string[];
};

@Injectable()
export class Service {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly urlExtractor: UrlExtractor.Service,
    private readonly contentDiscoveryQueueProducer: QueueProducer,
  ) { }

  async process(
    input: ServiceInput,
  ): Promise<ServiceOutput> {
    // 1. Retrieve content from S3 repository
    const content = await this.contentRepository.get(input.contentName);

    // 2. Extract URLs from content
    const extractedUrls = this.urlExtractor.extractUrls({
      content: content.body,
      type: this.determineContentType(content.type),
    });

    // 3. Push discovered URLs to content-discovery queue
    await Promise.all(
      extractedUrls.map((url) => this.contentDiscoveryQueueProducer.send({ url }))
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
