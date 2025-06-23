import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

// Simple waitFor implementation for e2e tests
// Inspired by the waitFor function from @testing-library/dom
// https://testing-library.com/docs/dom-testing-library/api-async/#waitfor
async function waitFor(
  condition: () => Promise<boolean>,
  opts: { timeout: number; interval: number } = {
    timeout: 30000,
    interval: 1000,
  },
): Promise<void> {
  const startTime = Date.now();
  let lastError: unknown = null;

  while (Date.now() - startTime < opts.timeout) {
    try {
      if (await condition()) {
        return;
      }
    } catch (err) {
      lastError = err; // keep the last error for debugging
    }
    await new Promise((resolve) => setTimeout(resolve, opts.interval));
  }

  const message =
    `Condition not met within ${opts.timeout}ms` +
    (lastError ? `, last error: ${lastError}` : '');
  throw new Error(message);
}

describe('Web Crawler E2E - SQS Message Processing', () => {
  const sqsClient = new SQSClient();
  const s3Client = new S3Client({ forcePathStyle: true });
  const queueUrl = process.env.AWS_SQS_CONTENT_DISCOVERY_QUEUE_URL;
  if (!queueUrl) {
    throw new Error(
      'AWS_SQS_CONTENT_DISCOVERY_QUEUE_URL environment variable is not set',
    );
  }

  beforeAll(async () => {
    // Cleanup: Delete all objects in the S3 bucket after tests
    const objects = await s3Client.send(
      new ListObjectsCommand({ Bucket: process.env.AWS_S3_CONTENT_BUCKET }),
    );

    for (const obj of objects.Contents ?? []) {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_CONTENT_BUCKET,
          Key: obj.Key,
        }),
      );
    }
  });

  it('should process SQS message and store content in S3', async () => {
    // Arrange
    const testUrl = 'https://httpbin.org/json';
    const messageBody = JSON.stringify({ url: testUrl });

    // Act - Send message to SQS
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: messageBody,
      }),
    );

    // Assert - Wait for content to be processed and stored in S3
    await waitFor(
      async () => {
        const objects = await s3Client.send(
          new ListObjectsCommand({
            Bucket: process.env.AWS_S3_CONTENT_BUCKET,
          }),
        );

        // Look for content that matches our test URL
        const matchingObjects = objects.Contents?.filter(
          (obj) =>
            obj.Key?.includes('httpbin.org') && obj.Key?.includes('json'),
        );

        if (!matchingObjects || matchingObjects.length === 0) {
          return false;
        }

        // Verify the content was actually stored
        const contentResponse = await s3Client.send(
          new GetObjectCommand({
            Bucket: process.env.AWS_S3_CONTENT_BUCKET,
            Key: matchingObjects[0].Key,
          }),
        );

        const content = await contentResponse.Body!.transformToString();
        return (
          content.includes('"slideshow"') &&
          contentResponse.ContentType === 'application/json'
        );
      },
      {
        timeout: 5_000, // 30 seconds timeout
        interval: 1_000, // Check every second
      },
    );
  }); // Test timeout

  it('should handle multiple URLs in sequence', async () => {
    // Arrange
    const testUrls = ['https://httpbin.org/html', 'https://httpbin.org/xml'];

    // Act - Send multiple messages to SQS
    for (const url of testUrls) {
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify({ url }),
        }),
      );
    }

    // Assert - Wait for all content to be processed
    await waitFor(
      async () => {
        const objects = await s3Client.send(
          new ListObjectsCommand({
            Bucket: process.env.AWS_S3_CONTENT_BUCKET,
          }),
        );

        // Look for content from both URLs
        const htmlObjects = objects.Contents?.filter(
          (obj) =>
            obj.Key?.includes('httpbin.org') && obj.Key?.includes('html'),
        );
        const xmlObjects = objects.Contents?.filter(
          (obj) => obj.Key?.includes('httpbin.org') && obj.Key?.includes('xml'),
        );

        if (
          !htmlObjects ||
          htmlObjects.length === 0 ||
          !xmlObjects ||
          xmlObjects.length === 0
        ) {
          return false;
        }

        // Verify HTML content
        const htmlResponse = await s3Client.send(
          new GetObjectCommand({
            Bucket: process.env.AWS_S3_CONTENT_BUCKET,
            Key: htmlObjects[0].Key,
          }),
        );
        const htmlContent = await htmlResponse.Body?.transformToString();
        const htmlValid = Boolean(
          htmlContent?.includes('<html>') &&
          htmlResponse.ContentType === 'text/html',
        );

        // Verify XML content
        const xmlKey = xmlObjects[0].Key;
        const xmlResponse = await s3Client.send(
          new GetObjectCommand({
            Bucket: process.env.AWS_S3_CONTENT_BUCKET,
            Key: xmlKey,
          }),
        );
        const xmlContent = await xmlResponse.Body?.transformToString();
        const xmlValid = Boolean(
          xmlContent?.includes('<?xml') &&
          xmlResponse.ContentType === 'application/xml',
        );

        return htmlValid && xmlValid;
      },
      {
        timeout: 10_000, // 45 seconds timeout for multiple URLs
        interval: 2_000, // Check every 2 seconds
      },
    );
  }); // Test timeout

  it('should handle invalid URLs gracefully', async () => {
    // Arrange
    const invalidUrl =
      'https://this-domain-definitely-does-not-exist-12345.com';
    const messageBody = JSON.stringify({ url: invalidUrl });

    // Act - Send message with invalid URL
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: messageBody,
      }),
    );

    // Assert - Wait a bit and verify no content was stored for this invalid URL
    await new Promise((resolve) => setTimeout(resolve, 5_000));

    const objects = await s3Client.send(
      new ListObjectsCommand({
        Bucket: process.env.AWS_S3_CONTENT_BUCKET,
      }),
    );

    // Should not have any objects with the invalid domain
    const invalidObjects = objects.Contents?.filter((obj) =>
      obj.Key?.includes('this-domain-definitely-does-not-exist-12345.com'),
    );

    expect(invalidObjects?.length || 0).toBe(0);
  }, 10_000);
});
