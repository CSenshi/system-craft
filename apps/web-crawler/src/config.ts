import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  get awsS3ContentBucket(): string {
    return this.configService.getOrThrow('AWS_S3_CONTENT_BUCKET');
  }

  get awsSqsContentDiscoveryQueueName(): string {
    return this.configService.getOrThrow(
      'AWS_SQS_CONTENT_DISCOVERY_QUEUE_NAME',
    );
  }

  get awsSqsContentDiscoveryQueueUrl(): string {
    return this.configService.getOrThrow('AWS_SQS_CONTENT_DISCOVERY_QUEUE_URL');
  }

  get awsSqsContentProcessingQueueName(): string {
    return this.configService.getOrThrow(
      'AWS_SQS_CONTENT_PROCESSING_QUEUE_NAME',
    );
  }

  get awsSqsContentProcessingQueueUrl(): string {
    return this.configService.getOrThrow(
      'AWS_SQS_CONTENT_PROCESSING_QUEUE_URL',
    );
  }
}
