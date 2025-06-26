import { Injectable, Logger } from '@nestjs/common';
import type { Message } from '@aws-sdk/client-sqs';
import { SqsMessageHandler } from '@ssut/nestjs-sqs';
import { ContentDiscovery } from '.';

@Injectable()
export class QueueConsumer {
  static readonly queueName =
    process.env['AWS_SQS_CONTENT_DISCOVERY_QUEUE_NAME']!;
  private readonly logger = new Logger('Content Discovery');

  constructor(
    private readonly contentDiscoveryService: ContentDiscovery.Service,
  ) {}

  @SqsMessageHandler(QueueConsumer.queueName)
  public async handleMessage(message: Message) {
    // this.logger.log({ messageBody: message.Body });

    const body = JSON.parse(message.Body) as ContentDiscovery.JobType;
    this.logger.debug(`Discovering content from URL: ${body.url}`);
    await this.contentDiscoveryService.discover({ url: body.url });
  }
}
