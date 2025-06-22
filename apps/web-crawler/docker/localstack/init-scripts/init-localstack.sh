#!/usr/bin/env bash
set -euo pipefail

# Create s3
awslocal s3 mb s3://web-crawler-bucket
