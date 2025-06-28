#!/usr/bin/env node

const {
  SQSClient,
  ListQueuesCommand,
  ReceiveMessageCommand,
  GetQueueAttributesCommand,
} = require('@aws-sdk/client-sqs');

const client = new SQSClient({
  endpoint: 'http://localhost:4566',
});

// Default DLQ names
const DEFAULT_DLQS = [
  'content-discovery-dlq-queue',
  'content-processor-dlq-queue',
];

function getQueueName(queueUrl) {
  const parts = queueUrl.split('/');
  return parts[parts.length - 1];
}

function formatTimestamp(timestamp) {
  return new Date(parseInt(timestamp) * 1000).toISOString();
}

function formatMessage(message, index) {
  const body = message.Body ? JSON.parse(message.Body) : 'No body';
  const receiptHandle = message.ReceiptHandle
    ? message.ReceiptHandle.substring(0, 50) + '...'
    : 'N/A';

  return {
    index: index + 1,
    messageId: message.MessageId || 'N/A',
    receiptHandle: receiptHandle,
    body: body,
    attributes: message.Attributes || {},
    timestamp: message.Attributes?.SentTimestamp
      ? formatTimestamp(message.Attributes.SentTimestamp)
      : 'N/A',
  };
}

async function getQueueMessageCount(queueUrl) {
  try {
    const command = new GetQueueAttributesCommand({
      QueueUrl: queueUrl,
      AttributeNames: [
        'ApproximateNumberOfMessages',
        'ApproximateNumberOfMessagesNotVisible',
        'ApproximateNumberOfMessagesDelayed',
      ],
    });

    const result = await client.send(command);
    const attributes = result.Attributes;

    return {
      visible: parseInt(attributes.ApproximateNumberOfMessages || '0'),
      notVisible: parseInt(
        attributes.ApproximateNumberOfMessagesNotVisible || '0',
      ),
      delayed: parseInt(attributes.ApproximateNumberOfMessagesDelayed || '0'),
      total:
        parseInt(attributes.ApproximateNumberOfMessages || '0') +
        parseInt(attributes.ApproximateNumberOfMessagesNotVisible || '0') +
        parseInt(attributes.ApproximateNumberOfMessagesDelayed || '0'),
    };
  } catch (error) {
    console.error(
      `❌ Failed to get message count for ${queueUrl}:`,
      error.message,
    );
    return {
      visible: 0,
      notVisible: 0,
      delayed: 0,
      total: 0,
    };
  }
}

async function listDLQMessages(queueName = null, maxMessages = 10) {
  try {
    console.log('🔍 Listing Dead Letter Queue messages...\n');

    let targetQueues = [];

    if (queueName) {
      // Specific queue requested
      const queueUrl = `http://sqs.eu-central-1.localhost.localstack.cloud:4566/000000000000/${queueName}`;
      targetQueues.push({ name: queueName, url: queueUrl });
    } else {
      // List all DLQs
      const listQueuesCommand = new ListQueuesCommand({});
      const { QueueUrls } = await client.send(listQueuesCommand);

      if (!QueueUrls || QueueUrls.length === 0) {
        console.log('ℹ️  No queues found');
        return;
      }

      // Filter for DLQ queues
      const dlqQueues = QueueUrls.filter((url) => {
        const name = getQueueName(url);
        return name.includes('dlq') || name.includes('DLQ');
      });

      if (dlqQueues.length === 0) {
        console.log('ℹ️  No Dead Letter Queues found');
        return;
      }

      targetQueues = dlqQueues.map((url) => ({
        name: getQueueName(url),
        url: url,
      }));
    }

    console.log(`📋 Found ${targetQueues.length} Dead Letter Queue(s)\n`);

    for (const { name, url } of targetQueues) {
      console.log(`📬 Queue: ${name}`);
      console.log(`🔗 URL: ${url}`);

      // Get message count
      const messageCount = await getQueueMessageCount(url);
      console.log(
        `📊 Messages: ${messageCount.visible} visible, ${messageCount.notVisible} in flight, ${messageCount.delayed} delayed (Total: ${messageCount.total})`,
      );

      if (messageCount.visible === 0) {
        console.log('ℹ️  No messages in this DLQ\n');
        continue;
      }

      // Receive messages
      const receiveCommand = new ReceiveMessageCommand({
        QueueUrl: url,
        MaxNumberOfMessages: Math.min(maxMessages, messageCount.visible),
        WaitTimeSeconds: 1,
        AttributeNames: ['All'],
        MessageAttributeNames: ['All'],
      });

      const result = await client.send(receiveCommand);
      const messages = result.Messages || [];

      if (messages.length === 0) {
        console.log('ℹ️  No messages received (they might be in flight)\n');
        continue;
      }

      console.log(`📥 Retrieved ${messages.length} message(s):\n`);

      // Table header
      console.log(
        '┌─────┬───────────────┬─────────────────────────────────────────────────────────────────────────────────────────',
      );
      console.log(
        '│ #   │ Receive Count │ Body                                                                                    ',
      );
      console.log(
        '├─────┼───────────────┼─────────────────────────────────────────────────────────────────────────────────────────',
      );

      messages.forEach((message, index) => {
        const formattedMessage = formatMessage(message, index);
        const receiveCount = (
          formattedMessage.attributes.ApproximateReceiveCount || 'N/A'
        )
          .toString()
          .padStart(11);
        const body = JSON.stringify(formattedMessage.body)
          .substring(0, 85)
          .padEnd(85);

        console.log(
          `│ ${(index + 1).toString().padStart(3)} │  ${receiveCount}  │ ${body} `,
        );
      });

      console.log(
        '└─────┴───────────────┴─────────────────────────────────────────────────────────────────────────────────────────',
      );
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error listing DLQ messages:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const queueName = args[0] || null;
const maxMessages = args[1] ? parseInt(args[1]) : 10;

// Show usage if help is requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🔍 DLQ Message Lister

Usage: node list-dlq-messages.js [queue-name] [max-messages]

Arguments:
  queue-name    Specific DLQ name to check (optional)
                If not provided, lists all DLQ queues
  max-messages  Maximum number of messages to retrieve (default: 10)

Examples:
  node list-dlq-messages.js                           # List all DLQs
  node list-dlq-messages.js content-discovery-dlq-queue  # List specific DLQ
  node list-dlq-messages.js content-processor-dlq-queue 5  # List 5 messages from specific DLQ

Available DLQs:
  - content-discovery-dlq-queue
  - content-processor-dlq-queue
`);
  process.exit(0);
}

listDLQMessages(queueName, maxMessages);
