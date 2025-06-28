import { Injectable, Logger } from '@nestjs/common';
import type { Message } from '@aws-sdk/client-sqs';
import { SqsConsumerEventHandler, SqsMessageHandler } from '@ssut/nestjs-sqs';
import { ContentProcessor, ZodQueueJobSchema } from '.';
import { ZodStringToJSONSchema } from '@libs/shared';


@Injectable()
export class QueueConsumer {
  private readonly logger = new Logger('Content Processor');
  static readonly queueName =
    process.env['AWS_SQS_CONTENT_PROCESSING_QUEUE_NAME']!;


  constructor(
    private readonly contentProcessingService: ContentProcessor.Service,
  ) { }

  @SqsMessageHandler(QueueConsumer.queueName)
  public async handleMessage(message: Message) {
    // this.logger.log({ messageBody: message.Body });


    const body = ZodQueueJobSchema.parse(
      ZodStringToJSONSchema.parse(message.Body),
    );
    this.logger.debug(`Processing content: ${body.contentName} | Depth: ${body.aux.depth}`);
    await this.contentProcessingService.process({
      contentName: body.contentName,
      currentDepth: body.aux.depth,
      crawlId: body.aux.crawlId,
    });
  }

  @SqsConsumerEventHandler(QueueConsumer.queueName, 'processing_error')
  public onProcessingError(err: Error, message: Message) {
    this.logger.error({ err: err.message, type: 'processing_error', message });
  }

  @SqsConsumerEventHandler(QueueConsumer.queueName, 'error')
  public onError(err: Error, message: Message) {
    this.logger.error({ err: err.message, type: 'error', message });
  }

  @SqsConsumerEventHandler(QueueConsumer.queueName, 'timeout_error')
  public onTimeoutError(err: Error, message: Message) {
    this.logger.error({ err: err.message, type: 'timeout_error', message });
  }
}
