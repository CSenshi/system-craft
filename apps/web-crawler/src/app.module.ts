import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { SqsModule } from '@ssut/nestjs-sqs';
import { ContentDownloaderService } from './services/content-downloader/content-downloader.service';
import { ContentRepository } from './services/content-repository/content.repository';
import { DnsResolverService } from './services/dns-resolver';
import { ContentDiscoveryService } from './workflows/content-discovery';
import { QueueProcessor } from './workflows/content-discovery/content-discovery.queue-producer';

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
    ContentDiscoveryService,
    ContentDownloaderService,
    ContentRepository,
    QueueProcessor,
  ],
})
export class AppModule {}
