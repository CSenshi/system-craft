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

  describe('exists', () => {
    const existingKey = 'integration-test/existing-file.txt';
    const nonExistingKey = 'integration-test/non-existing-file.txt';
    const emptyKey = '';
    const nullKey = 'null';

    beforeAll(async () => {
      // Create a test file for exists tests
      await repository.create({
        name: existingKey,
        body: 'test content for exists',
        type: 'text/plain',
      });
    });

    afterAll(async () => {
      // Clean up the test file
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_CONTENT_BUCKET,
          Key: existingKey,
        }),
      );
    });

    it('should return true for existing file', async () => {
      const result = await repository.exists(existingKey);
      expect(result).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      const result = await repository.exists(nonExistingKey);
      expect(result).toBe(false);
    });

    it('should return false for empty key', async () => {
      const result = await repository.exists(emptyKey);
      expect(result).toBe(false);
    });

    it('should return false for null-like key', async () => {
      const result = await repository.exists(nullKey);
      expect(result).toBe(false);
    });

    it('should return false for deeply nested non-existing path', async () => {
      const deepPath = 'integration-test/deeply/nested/path/non-existing-file.txt';
      const result = await repository.exists(deepPath);
      expect(result).toBe(false);
    });

    it('should return false for key with special characters', async () => {
      const specialKey = 'integration-test/file with spaces and special chars!@#.txt';
      const result = await repository.exists(specialKey);
      expect(result).toBe(false);
    });

    it('should return false for key with unicode characters', async () => {
      const unicodeKey = 'integration-test/测试文件.txt';
      const result = await repository.exists(unicodeKey);
      expect(result).toBe(false);
    });

    it('should return false for very long key', async () => {
      const longKey = 'integration-test/' + 'a'.repeat(1000) + '.txt';
      const result = await repository.exists(longKey);
      expect(result).toBe(false);
    });

    it('should return false for key with dots and slashes', async () => {
      const dotKey = 'integration-test/../file.txt';
      const result = await repository.exists(dotKey);
      expect(result).toBe(false);
    });

    it('should return false for key that looks like a directory', async () => {
      const dirKey = 'integration-test/directory/';
      const result = await repository.exists(dirKey);
      expect(result).toBe(false);
    });

    it('should return false for whitespace-only key', async () => {
      const whitespaceKey = '   ';
      const result = await repository.exists(whitespaceKey);
      expect(result).toBe(false);
    });

    it('should return false for key with only whitespace and tabs', async () => {
      const tabKey = '\t\n\r';
      const result = await repository.exists(tabKey);
      expect(result).toBe(false);
    });

    it('should return false for single character key', async () => {
      const singleCharKey = 'a';
      const result = await repository.exists(singleCharKey);
      expect(result).toBe(false);
    });

    it('should return false for key with only dots', async () => {
      const dotKey = '...';
      const result = await repository.exists(dotKey);
      expect(result).toBe(false);
    });
  });
});
