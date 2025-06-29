import { Injectable, Logger } from '@nestjs/common';
import { ZodStringToJSONSchema } from '@libs/shared';
import type { Message } from '@aws-sdk/client-sqs';
import { SqsConsumerEventHandler, SqsMessageHandler } from '@ssut/nestjs-sqs';
import { ContentDiscovery, ZodQueueJobSchema, queueName } from '.';
import { ContentAlreadyDiscoveredException } from './exceptions';

@Injectable()
export class QueueConsumer {
  private readonly logger = new Logger('Content Discovery');

  constructor(
    private readonly contentDiscoveryService: ContentDiscovery.Service,
  ) {}

  @SqsMessageHandler(queueName)
  public async handleMessage(message: Message) {
    const body = ZodQueueJobSchema.parse(
      ZodStringToJSONSchema.parse(message.Body),
    );

    this.logger.debug(
      `Discovering content from URL: ${body.url}| Depth: ${body.depth}`,
    );
    try {
      await this.contentDiscoveryService.discover({
        url: body.url,
        currentDepth: body.depth,
      });
    } catch (error) {
      if (error instanceof ContentAlreadyDiscoveredException) {
        return;
      }

      throw error; // Re-throw other errors to be handled by the error handler
    }
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
