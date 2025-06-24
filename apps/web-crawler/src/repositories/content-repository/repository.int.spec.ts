import { Test, TestingModule } from '@nestjs/testing';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import * as process from 'node:process';
import { ContentRepository } from './repository';

describe('ContentRepository (integration)', () => {
  const testKey = 'integration-test/test-file.txt';
  const testContent = 'integration test content';
  const testType = 'text/plain';

  let repository: ContentRepository;
  let s3Client: S3Client;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: S3Client,
          useValue: new S3Client({ forcePathStyle: true }),
        },
        ContentRepository,
      ],
    }).compile();

    repository = module.get<ContentRepository>(ContentRepository);
    s3Client = module.get<S3Client>(S3Client);
  });

  afterAll(async () => {
    // Optionally, clean up the test file
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_CONTENT_BUCKET,
        Key: testKey,
      }),
    );
  });

  it('should upload and retrieve content from S3', async () => {
    await repository.create({
      name: testKey,
      body: testContent,
      type: testType,
    });
    const result = await repository.get(testKey);
    expect(result.body).toBe(testContent);
    expect(result.type).toBe(testType);
  });

  it('should throw when getting a non-existent file', async () => {
    await expect(
      repository.get('integration-test/non-existent.txt'),
    ).rejects.toThrow();
  });
});
