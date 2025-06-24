import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import type { Message } from '@aws-sdk/client-sqs';
import { SqsMessageHandler, SqsService } from '@ssut/nestjs-sqs';
import crypto from 'node:crypto';
import { ContentProcessingService } from './content-processing.service';

export type ContentProcessingQueueJobType = {
  contentName: string;
};

@Injectable()
export class ContentProcessingQueueProcessor {
  static readonly queueName =
    process.env['AWS_SQS_CONTENT_PROCESSING_QUEUE_NAME']!;
  private readonly logger = new Logger('ContentProcessingQueueProcessor');

  constructor(
    private readonly sqsService: SqsService,
    // @Inject(forwardRef(() => ContentProcessingService))
    private readonly contentProcessingService: ContentProcessingService,
  ) {}

  public async send(body: ContentProcessingQueueJobType) {
    await this.sqsService.send(ContentProcessingQueueProcessor.queueName, {
      id: crypto.randomUUID(),
      body: body,
    });
  }

  @SqsMessageHandler(ContentProcessingQueueProcessor.queueName)
  public async handleMessage(message: Message) {
    this.logger.log({ messageBody: message.Body });

    const body = JSON.parse(message.Body);
    await this.contentProcessingService.process({ contentName: body.contentName });
  }
}
