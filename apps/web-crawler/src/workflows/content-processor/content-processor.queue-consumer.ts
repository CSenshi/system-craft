import { Injectable } from '@nestjs/common';
import { SqsService } from '@ssut/nestjs-sqs';
import crypto from 'node:crypto';
import { ContentProcessor } from '.';


@Injectable()
export class QueueConsumer {
  static readonly queueName =
    process.env['AWS_SQS_CONTENT_PROCESSING_QUEUE_NAME']!;

  constructor(
    private readonly sqsService: SqsService,
  ) { }

  public async send(body: ContentProcessor.QueueJobType) {
    await this.sqsService.send(QueueConsumer.queueName, {
      id: crypto.randomUUID(),
      body: body,
    });
  }
}
