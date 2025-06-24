import { Injectable } from '@nestjs/common';
import { ContentRepository } from '../../services/content-repository/content.repository';
import { UrlExtractorService } from '../../services/url-extractor/url-extractor.service';

export type ContentProcessingServiceInput = {
  contentName: string; // S3 object key/name
};

export type ContentProcessingServiceResult = {
  contentName: string;
  extractedUrls: string[];
};

@Injectable()
export class ContentProcessingService {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly urlExtractor: UrlExtractorService,
  ) {}

  async process(
    input: ContentProcessingServiceInput,
  ): Promise<ContentProcessingServiceResult> {
    // 1. Retrieve content from S3 repository
    const content = await this.contentRepository.get(input.contentName);

    // 2. Extract URLs from content
    const extractedUrls = this.urlExtractor.extractUrls({
      content: content.body,
      type: this.determineContentType(content.type),
    });

    // 3. Push discovered URLs to content-discovery queue
    await this.pushUrlsToDiscoveryQueue(extractedUrls);

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

  private async pushUrlsToDiscoveryQueue(urls: string[]): Promise<void> {
    // ToDO: Implement the actual queue logic
  }
}
