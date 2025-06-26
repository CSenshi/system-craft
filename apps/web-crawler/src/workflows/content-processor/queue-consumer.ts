import { Injectable, Logger } from '@nestjs/common';
import type { Message } from '@aws-sdk/client-sqs';
import { SqsMessageHandler } from '@ssut/nestjs-sqs';
import { ContentProcessor } from '.';


@Injectable()
export class QueueConsumer {
  private readonly logger = new Logger('Content Processor');

  constructor(
    private readonly contentProcessingService: ContentProcessor.Service,
  ) { }

  @SqsMessageHandler(process.env['AWS_SQS_CONTENT_PROCESSING_QUEUE_NAME']!)
  public async handleMessage(message: Message) {
    // this.logger.log({ messageBody: message.Body });

    const body = JSON.parse(message.Body) as ContentProcessor.QueueJobType;
    this.logger.debug(`Processing content: ${body.contentName}`);
    await this.contentProcessingService.process({ contentName: body.contentName });
  }
}
