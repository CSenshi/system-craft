import { Injectable } from '@nestjs/common';
import { SqsService } from '@ssut/nestjs-sqs';
import crypto from 'node:crypto';
import { ContentDiscovery } from '.';
import { AppConfigService } from '../../config';

@Injectable()
export class QueueProducer {
  constructor(
    private readonly sqsService: SqsService,
    private readonly appConfigService: AppConfigService,
  ) {}

  public async send(body: ContentDiscovery.JobType) {
    await this.sqsService.send(
      this.appConfigService.awsSqsContentDiscoveryQueueName,
      {
        id: crypto.randomUUID(),
        body: body,
      },
    );
  }
}
