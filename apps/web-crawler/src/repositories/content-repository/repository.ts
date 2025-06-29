import { Injectable } from '@nestjs/common';
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import * as process from 'node:process';
import { ContentNotFoundException } from './exception';

type ContentCreateType = {
  name: string;
  body: string;
  type: string;
};
@Injectable()
export class ContentRepository {
  constructor(private readonly s3Client: S3Client) {}

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

  async exists(name: string): Promise<boolean> {
    // S3 doesn't allow empty keys, so return false immediately
    if (!name || name.trim() === '') {
      return false;
    }

    const params = {
      Bucket: process.env.AWS_S3_CONTENT_BUCKET,
      Key: name,
    };

    try {
      await this.s3Client.send(new HeadObjectCommand(params));
      return true;
    } catch (error) {
      if (S3ServiceException.isInstance(error)) {
        if (error.$metadata?.httpStatusCode === 404) {
          return false;
        }
      }
      throw error;
    }
  }
}
