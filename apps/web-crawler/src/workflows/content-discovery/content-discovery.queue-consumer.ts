import { Injectable } from '@nestjs/common';
import { SqsService } from '@ssut/nestjs-sqs';
import crypto from 'node:crypto';
import { ContentDiscovery } from '.';

@Injectable()
export class QueueConsumer {
  constructor(
    private readonly sqsService: SqsService,
  ) { }

  public async send(body: ContentDiscovery.JobType) {
    await this.sqsService.send(process.env['AWS_SQS_CONTENT_DISCOVERY_QUEUE_NAME']!, {
      id: crypto.randomUUID(),
      body: body,
    });
  }

}
