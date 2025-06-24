import { Injectable, Logger } from '@nestjs/common';
import type { Message } from '@aws-sdk/client-sqs';
import { SqsMessageHandler } from '@ssut/nestjs-sqs';
import { Service } from './content-discovery.service';
import { ContentDiscovery } from '.';


@Injectable()
export class QueueProducer {
  static readonly queueName =
    process.env['AWS_SQS_CONTENT_DISCOVERY_QUEUE_NAME']!;
  private readonly logger = new Logger('ContentDiscoveryQueueProcessor');

  constructor(
    private readonly contentDiscoveryService: Service,
  ) { }


  @SqsMessageHandler(QueueProducer.queueName)
  public async handleMessage(message: Message) {
    this.logger.log({ messageBody: message.Body });

    const body = JSON.parse(message.Body) as ContentDiscovery.JobType;
    await this.contentDiscoveryService.discover({ url: body.url });
  }
}
