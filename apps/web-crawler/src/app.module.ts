import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { SqsModule } from '@ssut/nestjs-sqs';
import { AppConfigService } from './config';
import { ContentDownloader } from './services/content-downloader';
import { ContentRepository } from './repositories/content-repository/repository';
import { DnsResolver } from './services/dns-resolver';
import { UrlExtractor } from './services/url-extractor';
import { ContentDiscovery } from './workflows/content-discovery';
import { ContentProcessor } from './workflows/content-processor';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { CrawlMetadataRepository } from './repositories/crawl-metadata-repository/repository';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SqsModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const opts = [
          {
            name: cfg.getOrThrow('AWS_SQS_CONTENT_DISCOVERY_QUEUE_NAME'),
            queueUrl: cfg.getOrThrow('AWS_SQS_CONTENT_DISCOVERY_QUEUE_URL'),
          },
          {
            name: cfg.getOrThrow('AWS_SQS_CONTENT_PROCESSING_QUEUE_NAME'),
            queueUrl: cfg.getOrThrow('AWS_SQS_CONTENT_PROCESSING_QUEUE_URL'),
          },
        ];

        return { consumers: opts, producers: opts };
      },
    }),
  ],
  providers: [
    AppConfigService,
    {
      provide: S3Client,
      useValue: new S3Client({ forcePathStyle: true }),
    },
    {
      provide: DynamoDBDocumentClient,
      useValue: DynamoDBDocumentClient.from(new DynamoDBClient()),
    },
    // Workflows
    ContentDiscovery.Service,
    ContentDiscovery.QueueProducer,
    ContentDiscovery.QueueConsumer,
    ContentProcessor.Service,
    ContentProcessor.QueueProducer,
    ContentProcessor.QueueConsumer,
    // Services
    {
      provide: DnsResolver.Service,
      useValue: new DnsResolver.Service(['8.8.8.8', '1.1.1.1']),
    },
    ContentDownloader.Service,
    UrlExtractor.Service,
    // Repositories
    ContentRepository,
    CrawlMetadataRepository,
  ],
})
export class AppModule { }
