import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { SqsModule } from '@ssut/nestjs-sqs';
import { ContentDownloaderService } from './services/content-downloader/content-downloader.service';
import { ContentRepository } from './services/content-repository/content.repository';
import { DnsResolverService } from './services/dns-resolver';
import { UrlExtractorService } from './services/url-extractor/url-extractor.service';
import { ContentDiscovery } from './workflows/content-discovery';
import { ContentProcessor } from './workflows/content-processor';

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
    {
      provide: S3Client,
      useValue: new S3Client({ forcePathStyle: true }),
    },
    {
      provide: DnsResolverService,
      useValue: new DnsResolverService(['8.8.8.8', '1.1.1.1']),
    },
    ContentDiscovery.Service,
    ContentDiscovery.QueueConsumer,
    ContentProcessor.Service,
    ContentProcessor.QueueProducer,
    ContentDownloaderService,
    ContentRepository,
    UrlExtractorService,
  ],
})
export class AppModule { }
