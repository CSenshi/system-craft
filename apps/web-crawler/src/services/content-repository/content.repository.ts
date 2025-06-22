import { Injectable } from '@nestjs/common';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import * as process from 'node:process';
import { ContentNotFoundException } from './content.repository.exception';

type ContentCreateType = {
  name: string;
  body: string;
  type: string;
};

@Injectable()
export class ContentRepository {
  constructor(private readonly s3Client: S3Client) { }

  async create(content: ContentCreateType): Promise<void> {
    const { body, type } = content;

    const params = {
      Bucket: process.env.AWS_S3_CONTENT_BUCKET,
      Key: `${content.name}`,
      Body: body,
      ContentType: type,
    };

    await this.s3Client.send(new PutObjectCommand(params));
  }

  async get(name: string): Promise<{ body: string; type: string | undefined }> {
    const params = {
      Bucket: process.env.AWS_S3_CONTENT_BUCKET,
      Key: name,
    };
    const result = await this.s3Client.send(new GetObjectCommand(params));

    if (!result.Body) {
      throw new ContentNotFoundException(name);
    }

    const body = await result.Body.transformToString();
    return { body, type: result.ContentType };
  }
}
