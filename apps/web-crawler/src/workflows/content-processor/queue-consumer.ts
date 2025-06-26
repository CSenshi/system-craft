import { Injectable, Logger } from '@nestjs/common';
import type { Message } from '@aws-sdk/client-sqs';
import { SqsMessageHandler } from '@ssut/nestjs-sqs';
import { ContentProcessor, ZodQueueJobSchema } from '.';
import { ZodStringToJSONSchema } from '@libs/shared';


@Injectable()
export class QueueConsumer {
  private readonly logger = new Logger('Content Processor');

  constructor(
    private readonly contentProcessingService: ContentProcessor.Service,
  ) { }

  @SqsMessageHandler(process.env['AWS_SQS_CONTENT_PROCESSING_QUEUE_NAME']!)
  public async handleMessage(message: Message) {
    // this.logger.log({ messageBody: message.Body });


    const body = ZodQueueJobSchema.parse(
      ZodStringToJSONSchema.parse(message.Body),
    );
    this.logger.debug(`Processing content: ${body.contentName}`);
    await this.contentProcessingService.process({ contentName: body.contentName });
  }
}
