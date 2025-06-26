#!/usr/bin/env node

const {
  SQSClient,
  ListQueuesCommand,
  PurgeQueueCommand,
  GetQueueAttributesCommand
} = require('@aws-sdk/client-sqs');

const client = new SQSClient({
  endpoint: 'http://localhost:4566'
});

async function getQueueMessageCount(queueUrl) {
  try {
    const command = new GetQueueAttributesCommand({
      QueueUrl: queueUrl,
      AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible', 'ApproximateNumberOfMessagesDelayed']
    });

    const result = await client.send(command);
    const attributes = result.Attributes;

    return {
      visible: parseInt(attributes.ApproximateNumberOfMessages || '0'),
      notVisible: parseInt(attributes.ApproximateNumberOfMessagesNotVisible || '0'),
      delayed: parseInt(attributes.ApproximateNumberOfMessagesDelayed || '0'),
      total: parseInt(attributes.ApproximateNumberOfMessages || '0') +
        parseInt(attributes.ApproximateNumberOfMessagesNotVisible || '0') +
        parseInt(attributes.ApproximateNumberOfMessagesDelayed || '0')
    };
  } catch (error) {
    console.error(`❌ Failed to get message count for ${queueUrl}:`, error.message);
    return {
      visible: 0,
      notVisible: 0,
      delayed: 0,
      total: 0
    };
  }
}

function getQueueName(queueUrl) {
  const parts = queueUrl.split('/');
  return parts[parts.length - 1];
}

async function clearAllSQSQueues() {
  try {
    console.log('🔄 Clearing all SQS queues...\n');

    // List all queues
    const listQueuesCommand = new ListQueuesCommand({});
    const {
      QueueUrls
    } = await client.send(listQueuesCommand);

    if (!QueueUrls || QueueUrls.length === 0) {
      console.log('ℹ️  No queues found to clear');
      return;
    }

    console.log(`📋 Found ${QueueUrls.length} queue(s)`);

    // Table header
    console.log(`
┌─────────────────────────────────────┬─────────┬──────────┬─────────┬───────┐
│ Queue Name                          │ Visible │ In Flight│ Delayed │ Total │
├─────────────────────────────────────┼─────────┼──────────┼─────────┼───────┤`);

    let totalMessagesCleared = 0;
    const queueResults = [];

    // Get message counts for all queues first
    for (const queueUrl of QueueUrls) {
      const messageCount = await getQueueMessageCount(queueUrl);
      const queueName = getQueueName(queueUrl);
      queueResults.push({
        queueUrl,
        queueName,
        messageCount
      });
      totalMessagesCleared += messageCount.total;
    }

    // Display table rows
    for (const {
        queueName,
        messageCount
      } of queueResults) {
      const name = queueName.padEnd(35);
      const visible = messageCount.visible.toString().padStart(7);
      const inFlight = messageCount.notVisible.toString().padStart(8);
      const delayed = messageCount.delayed.toString().padStart(7);
      const total = messageCount.total.toString().padStart(5);

      console.log(`│ ${name} │ ${visible} │ ${inFlight} │ ${delayed} │ ${total} │`);
    }

    console.log(`└─────────────────────────────────────┴─────────┴──────────┴─────────┴───────┘`);

    // Clear all queues
    console.log('\n🗑️  Clearing queues...');
    for (const {
        queueUrl,
        queueName
      } of queueResults) {
      try {
        const purgeCommand = new PurgeQueueCommand({
          QueueUrl: queueUrl
        });
        await client.send(purgeCommand);
        console.log(`✅ ${queueName}`);
      } catch (error) {
        console.error(`❌ ${queueName}: ${error.message}`);
      }
    }

    console.log(`\n✅ All queues cleared successfully! Total messages cleared: ${totalMessagesCleared}`);

  } catch (error) {
    console.error('❌ Error clearing queues:', error.message);
    process.exit(1);
  }
}

clearAllSQSQueues();
