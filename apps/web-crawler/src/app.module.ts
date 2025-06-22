import { Module } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { ContentRepository } from './services/content-repository/content.repository';

@Module({
  imports: [],
  controllers: [],
  providers: [
    {
      provide: S3Client,
      useValue: new S3Client({ forcePathStyle: true }),
    },
    ContentRepository,
  ],
})
export class AppModule {}
