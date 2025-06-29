import { Injectable, Logger } from '@nestjs/common';
import { ZodStringToJSONSchema } from '@libs/shared';
import type { Message } from '@aws-sdk/client-sqs';
import { SqsConsumerEventHandler, SqsMessageHandler } from '@ssut/nestjs-sqs';
import { ContentProcessor, ZodQueueJobSchema, queueName } from '.';

@Injectable()
export class QueueConsumer {
  private readonly logger = new Logger('Content Processor');

  constructor(
    private readonly contentProcessingService: ContentProcessor.Service,
  ) {}

  @SqsMessageHandler(queueName)
  public async handleMessage(message: Message) {
    const body = ZodQueueJobSchema.parse(
      ZodStringToJSONSchema.parse(message.Body),
    );

    this.logger.debug(
      `Processing content: ${body.contentName} | Depth: ${body.aux.depth}`,
    );
    await this.contentProcessingService.process({
      contentName: body.contentName,
      currentDepth: body.aux.depth,
      crawlId: body.aux.crawlId,
    });
  }

  @SqsConsumerEventHandler(queueName, 'processing_error')
  public onProcessingError(err: Error, message: Message) {
    this.logger.error({ err: err.message, type: 'processing_error', message });
  }

  @SqsConsumerEventHandler(queueName, 'error')
  public onError(err: Error, message: Message) {
    this.logger.error({ err: err.message, type: 'error', message });
  }

  @SqsConsumerEventHandler(queueName, 'timeout_error')
  public onTimeoutError(err: Error, message: Message) {
    this.logger.error({ err: err.message, type: 'timeout_error', message });
  }
}
