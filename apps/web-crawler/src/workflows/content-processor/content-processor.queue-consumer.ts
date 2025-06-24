import { Injectable } from '@nestjs/common';
import { SqsService } from '@ssut/nestjs-sqs';
import crypto from 'node:crypto';
import { ContentProcessor } from '.';
import { AppConfigService } from '../../config';

@Injectable()
export class QueueConsumer {
  constructor(
    private readonly sqsService: SqsService,
    private readonly appConfigService: AppConfigService,
  ) {}

  public async send(body: ContentProcessor.QueueJobType) {
    await this.sqsService.send(
      this.appConfigService.awsSqsContentProcessingQueueName,
      {
        id: crypto.randomUUID(),
        body: body,
      },
    );
  }
}
