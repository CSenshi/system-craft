import { Injectable, Logger } from '@nestjs/common';
import type { Message } from '@aws-sdk/client-sqs';
import { SqsMessageHandler, SqsService } from '@ssut/nestjs-sqs';
import crypto from 'node:crypto';
import { ContentDiscoveryService } from './content-discovery.service';

export type ContentDiscoveryQueueJobType = {
  url: string;
};
@Injectable()
export class QueueProcessor {
  static readonly queueName =
    process.env['AWS_SQS_CONTENT_DISCOVERY_QUEUE_NAME']!;
  private readonly logger = new Logger('ContentDiscoveryQueueProcessor');

  constructor(
    private readonly sqsService: SqsService,
    private readonly contentDiscoveryService: ContentDiscoveryService,
  ) {}

  public async send(body: ContentDiscoveryQueueJobType) {
    await this.sqsService.send(QueueProcessor.queueName, {
      id: crypto.randomUUID(),
      body: body,
    });
  }

  @SqsMessageHandler(QueueProcessor.queueName)
  public async handleMessage(message: Message) {
    this.logger.log({ messageBody: message.Body });

    const body = JSON.parse(message.Body);
    await this.contentDiscoveryService.discover({ url: body.url });
  }
}
