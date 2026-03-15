#!/usr/bin/env bash
set -euo pipefail

# Create S3 bucket for raw click event archive
awslocal s3 mb s3://ad-clicks-raw
