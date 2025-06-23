# Testing Strategy for Web Crawler

This document outlines our comprehensive testing strategy that ensures code quality, reliability, and maintainability.

## Testing Pyramid

```
    E2E Tests (e2e/web-crawler/)
    ┌─────────────────────────┐
    │ Few, slow, expensive    │
    │ Real AWS S3 + HTTP      │
    └─────────────────────────┘

Integration Tests (*.int.spec.ts)
┌─────────────────────────────┐
│ Medium count, medium speed  │
│ LocalStack S3 + Real HTTP   │
└─────────────────────────────┘

    Unit Tests (*.spec.ts)
    ┌─────────────────────────┐
    │ Many, fast, cheap       │
    │ Everything mocked       │
    └─────────────────────────┘
```

## Test Types

### 1. Unit Tests (`*.spec.ts`)

**Purpose**: Test individual functions/methods in isolation
**Dependencies**: Mock everything (S3, HTTP, DNS)
**Speed**: Fastest (milliseconds)
**Location**: `apps/web-crawler/src/**/*.spec.ts`

**Example**:

```typescript
describe('ContentDiscovery', () => {
  it('should crawl URL with mocked dependencies', async () => {
    // Mock S3, HTTP, DNS
    // Test business logic only
  });
});
```

**When to use**:

- Testing business logic
- Testing error handling
- Fast feedback during development
- CI/CD pipeline (always run)

### 2. Integration Tests (`*.int.spec.ts`)

**Purpose**: Test service interactions with real infrastructure and external HTTP
**Dependencies**: LocalStack S3, real HTTP requests
**Speed**: Medium (seconds to minutes)
**Location**: `apps/web-crawler/src/**/*.int.spec.ts`

**Example**:

```typescript
describe('ContentRepository (integration)', () => {
  it('should store content in LocalStack S3', async () => {
    // Real S3Client with LocalStack
    // Real HTTP calls to external services
  });
});
```

**When to use**:

- Testing AWS SDK integration
- Testing service orchestration
- Testing real HTTP interactions
- Validating infrastructure setup
- Pre-deployment validation

### 3. E2E Tests (`e2e/web-crawler/`)

**Purpose**: Test the entire application end-to-end
**Dependencies**: Real AWS S3, real HTTP requests
**Speed**: Slowest (30+ seconds)
**Location**: `e2e/web-crawler/src/**/*.spec.ts`

**Example**:

```typescript
describe('WebCrawler E2E', () => {
  it('should crawl real website via HTTP API', async () => {
    // Real HTTP requests to your API
    // Real AWS S3 storage
  });
});
```

**When to use**:

- Production deployment validation
- Complete user journey testing
- Real-world scenario validation
- Staging environment testing

## Environment Setup

### Local Development

```bash
# Start LocalStack for integration tests
docker-compose up -d

# Set environment variables
export LOCALSTACK_ENDPOINT=http://localhost:4566
export AWS_S3_CONTENT_BUCKET=test-bucket

# Run tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:e2e         # E2E tests only
```

### CI/CD Pipeline

```yaml
# Example GitHub Actions workflow
- name: Run Unit Tests
  run: npm run test:unit

- name: Start LocalStack
  run: docker-compose up -d

- name: Run Integration Tests
  run: npm run test:integration

- name: Run E2E Tests (staging)
  run: npm run test:e2e
  env:
    AWS_S3_CONTENT_BUCKET: ${{ secrets.STAGING_S3_BUCKET }}
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Best Practices

### 1. Test Naming Convention

```typescript
// Unit tests
describe('ContentDiscovery', () => {
  it('should handle DNS resolution errors', () => {});
});

// Integration tests
describe('ContentDiscovery (integration)', () => {
  it('should crawl URL with LocalStack S3 and real HTTP', () => {});
});

// E2E tests
describe('WebCrawler E2E', () => {
  it('should crawl real website via HTTP API', () => {});
});
```

### 2. Mocking Strategy

```typescript
// Unit tests - Mock everything
jest.mock('@aws-sdk/client-s3');
jest.mock('axios');

// Integration tests - Use LocalStack, real HTTP
const s3Client = new S3Client({
  endpoint: 'http://localhost:4566', // LocalStack
  forcePathStyle: true,
});
// No HTTP mocking - use real requests

// E2E tests - Use real services
const s3Client = new S3Client({
  region: 'us-east-1', // Real AWS
});
// No mocking of HTTP - use real requests
```

### 3. Test Data Management

```typescript
// Use unique test data to avoid conflicts
const testKey = `test-${Date.now()}-${Math.random()}`;

// Clean up after tests
afterAll(async () => {
  await cleanupTestData();
});
```

### 4. Error Handling

```typescript
// Test both success and failure scenarios
it('should handle successful crawl', async () => {});
it('should handle DNS resolution failure', async () => {});
it('should handle HTTP request failure', async () => {});
it('should handle S3 storage failure', async () => {});
```

### 5. Timeout Management

```typescript
// Integration tests with real HTTP need longer timeouts
it('should crawl real website', async () => {
  // Test logic
}, 30000); // 30 second timeout for real HTTP operations
```

## Running Tests

### Development Workflow

```bash
# During development - run unit tests frequently
npm run test:unit -- --watch

# Before commit - run all tests
npm run test:all

# Before deployment - run E2E tests
npm run test:e2e
```

### CI/CD Commands

```bash
# Unit tests (always run)
npx nx test @apps/web-crawler --testPathPattern="\.spec\.ts$"

# Integration tests (with LocalStack and real HTTP)
npx nx test @apps/web-crawler --testPathPattern="\.int\.spec\.ts$"

# E2E tests (with real AWS)
npx nx e2e @e2e/web-crawler
```

## Troubleshooting

### Common Issues

1. **LocalStack not running**

   ```bash
   docker-compose up -d
   ```

2. **AWS credentials not configured**

   ```bash
   aws configure
   ```

3. **S3 bucket doesn't exist**

   ```bash
   aws s3 mb s3://your-test-bucket
   ```

4. **Network connectivity issues**

   - Check firewall settings
   - Verify DNS resolution
   - Test with `curl` or `wget`

5. **HTTP timeout issues**
   - Increase test timeouts for integration tests
   - Check internet connectivity
   - Verify target URLs are accessible

### Debug Mode

```bash
# Run tests with verbose output
npm run test:integration -- --verbose

# Run specific test file
npm run test:integration -- --testPathPattern="web-crawler.service.int.spec.ts"
```

## Benefits of This Strategy

1. **Fast Feedback**: Unit tests run in milliseconds
2. **Real Integration**: Integration tests use real HTTP for realistic testing
3. **Reliable**: Integration tests catch infrastructure issues
4. **Comprehensive**: E2E tests validate complete workflows
5. **Cost-Effective**: LocalStack reduces AWS costs
6. **Maintainable**: Clear separation of concerns
7. **Scalable**: Easy to add new test types

## Conclusion

This testing strategy provides:

- ✅ **Fast development cycles** with unit tests
- ✅ **Realistic integration testing** with real HTTP and LocalStack
- ✅ **Production confidence** with E2E tests
- ✅ **Clear expectations** for all developers
- ✅ **Cost-effective** testing infrastructure

Follow this strategy to ensure your web crawler is robust, reliable, and maintainable!
