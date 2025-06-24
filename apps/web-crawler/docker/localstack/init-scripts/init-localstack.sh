#!/usr/bin/env bash
set -euo pipefail

# Create s3
awslocal s3 mb s3://web-crawler-bucket

# Create sqs
awslocal sqs create-queue --queue-name content-discovery-queue
awslocal sqs create-queue --queue-name content-discovery-dlq-queue
awslocal sqs set-queue-attributes \
	--queue-url http://sqs.eu-central-1.localhost.localstack.cloud:4566/000000000000/content-discovery-queue \
	--attributes '{
		"RedrivePolicy": "{\"deadLetterTargetArn\":\"arn:aws:sqs:eu-central-1:000000000000:content-discovery-dlq-queue\",\"maxReceiveCount\":\"1\"}"
	}'

# Create content processor queue
awslocal sqs create-queue --queue-name content-processor-queue
awslocal sqs create-queue --queue-name content-processor-dlq-queue
awslocal sqs set-queue-attributes \
	--queue-url http://sqs.eu-central-1.localhost.localstack.cloud:4566/000000000000/content-processor-queue \
	--attributes '{
		"RedrivePolicy": "{\"deadLetterTargetArn\":\"arn:aws:sqs:eu-central-1:000000000000:content-processor-dlq-queue\",\"maxReceiveCount\":\"1\"}"
	}'
