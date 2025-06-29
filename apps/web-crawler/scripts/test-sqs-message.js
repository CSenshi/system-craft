#!/usr/bin/env node

const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

const client = new SQSClient({
  endpoint: 'http://localhost:4566',
});

// Default test message
const defaultTestMessage = {
  url: 'https://httpbin.org/',
  depth: 2,
};

async function sendTestMessage(
  queueName = 'content-discovery-queue',
  message = null,
) {
  try {
    const queueUrl = `http://sqs.eu-central-1.localhost.localstack.cloud:4566/000000000000/${queueName}`;
    const messageBody = message || JSON.stringify(defaultTestMessage, null, 2);

    console.log(`📤 Sending test message to queue: ${queueName}`);
    console.log(`   Message: ${messageBody}`);

    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: messageBody,
    });

    const result = await client.send(command);
    console.log(`✅ Message sent successfully!`);
    console.log(`🆔 Message ID: ${result.MessageId}`);
  } catch (error) {
    console.error('❌ Error sending message:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const queueName = args[0] || 'content-discovery-queue';
const customMessage = args[1] ? JSON.parse(args[1]) : null;

sendTestMessage(queueName, customMessage);
