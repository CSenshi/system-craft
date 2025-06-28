import { Injectable } from '@nestjs/common';
import {
  DynamoDBDocumentClient,
  GetCommand,
  GetCommandInput,
  PutCommand,
  PutCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { AppConfigService } from '../../config';

export type CrawlMetadata = {
  id: string;
  startUrl: string;
  domain: string;
  protocol: string;
  depth: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class CrawlMetadataRepository {
  constructor(
    private readonly dynamoDbClient: DynamoDBDocumentClient,
    private readonly appConfig: AppConfigService,
  ) {}

  async create(metadata: CrawlMetadata): Promise<void> {
    const params: PutCommandInput = {
      TableName: this.appConfig.awsDynamoDbCrawlMetadataTableName,
      Item: {
        ...metadata,
        createdAt: metadata.createdAt.toISOString(),
        updatedAt: metadata.updatedAt.toISOString(),
      },
    };

    await this.dynamoDbClient.send(new PutCommand(params));
  }

  async get(crawlId: string): Promise<CrawlMetadata | null> {
    if (!crawlId) {
      return null;
    }

    const params: GetCommandInput = {
      TableName: this.appConfig.awsDynamoDbCrawlMetadataTableName,
      Key: { id: crawlId },
    };

    const result = await this.dynamoDbClient.send(new GetCommand(params));

    if (!result.Item) {
      return null;
    }

    // Convert ISO strings back to Date objects
    return {
      ...result.Item,
      createdAt: new Date(result.Item.createdAt),
      updatedAt: new Date(result.Item.updatedAt),
    } as CrawlMetadata;
  }
}
