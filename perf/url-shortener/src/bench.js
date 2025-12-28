import { check, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Rate } from 'k6/metrics';

// Custom metrics for cache analytics
const cacheHitCount = new Counter('cache_hits');
const cacheMissCount = new Counter('cache_misses');
const cacheHitRate = new Rate('cache_hit_rate');

const host = __ENV.HOST || `http://localhost:3000`;

// Test URLs for variety
const testUrls = [
  'https://example.com',
  'https://www.google.com',
  'https://github.com',
  'https://stackoverflow.com',
  'https://www.reddit.com',
  'https://www.youtube.com',
  'https://www.amazon.com',
  'https://www.netflix.com',
  'https://www.spotify.com',
  'https://www.instagram.com',
];

// Pre-created short URL IDs for redirect testing (you'll need to populate these)
const existingShortUrlIds = [
  // Add your existing short URL IDs here
  // These should be real short URLs that exist in your database
  // Example: 'abc123', 'def456', 'ghi789'
];

const shortId = Math.random().toString(36).substring(2, 10);
export const options = {
  tags: {
    testid: shortId,
  },
  scenarios: {
    // Load testing with gradual scaling
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '3s', target: 0 },
        // 50 users (~100 req/s)
        { duration: '30s', target: 50 },
        // 100 users (~200 req/s)
        { duration: '30s', target: 100 },
        // 250 users (~500 req/s)
        { duration: '30s', target: 250 },
        // 500 users (~1000 req/s)
        { duration: '30s', target: 500 },
        // 1000 users (~2000 req/s)
        { duration: '30s', target: 1000 },
        // 2000 users (~4000 req/s)
        { duration: '30s', target: 2000 },
        // 3000 users (~6000 req/s)
        { duration: '30s', target: 3000 },
        // 4000 users (~8000 req/s)
        { duration: '30s', target: 4000 },
        // 5000 users (~10000 req/s) - SPIKE
        { duration: '30s', target: 5000 },
        // Drop back down
        { duration: '30s', target: 2000 },
        // Ramp down to 0
        { duration: '30s', target: 0 },
      ],
      exec: 'loadTest',
    },
  },

  thresholds: {
    // Critical requirement: redirection < 100ms
    http_req_failed: ['rate<0.0001'], // 99.99% availability = 0.01% error rate
    http_reqs: ['rate>50'], // At least 50 requests per second

    // Method-specific thresholds
    'http_req_duration{name:redirect}': ['p(95)<100', 'p(99)<200'],
    'http_req_duration{name:shorten}': ['p(95)<500'],
    'http_req_failed{name:redirect}': ['rate<0.0001'], // GET error rate < 0.01%
    'http_req_failed{name:shorten}': ['rate<0.0001'], // POST error rate < 0.01%

    // Cache performance thresholds
    'http_req_duration{cache:hit}': ['p(95)<50'], // Cache hits should be very fast
    'http_req_duration{cache:miss}': ['p(95)<100'], // Cache misses can be slower
  },
};

// Load test scenario
export function loadTest() {
  // 20:1 read/write ratio (95% reads, 5% writes)
  if (Math.random() < 0.95) {
    testUrlRedirection();
  } else {
    testUrlShortening();
  }

  const minTime = 0.01;
  const maxTime = 0.1;
  sleep(minTime + Math.random() * (maxTime - minTime));
}

// Default function for backward compatibility
export default function () {
  loadTest();
}

function testUrlShortening() {
  const randomUrl = testUrls[Math.floor(Math.random() * testUrls.length)];

  const response = http.post(
    `${host}/url`,
    JSON.stringify({
      url: randomUrl,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      tags: {
        name: 'shorten',
      },
      timeout: '30s',
    },
  );

  check(response, {
    'URL shortening returns 201': (r) => r.status === 201,
    'URL shortening response time < 500ms': (r) => r.timings.duration < 500,
  });
}

function testUrlRedirection() {
  // Use existing short URL IDs for redirect testing
  if (existingShortUrlIds.length === 0) {
    return;
  }

  // Pick a random existing short URL ID
  const shortUrlId =
    existingShortUrlIds[Math.floor(Math.random() * existingShortUrlIds.length)];

  // Make the request first to get cache status
  const redirectResponse = http.get(`${host}/l/${shortUrlId}`, {
    redirects: 0, // Don't follow redirects, just check the response
    tags: {
      name: 'redirect',
    },
    timeout: '30s',
  });

  // Analyze cache performance from the actual request
  const cacheStatus = redirectResponse.headers['X-Cache'] || 'MISS';
  const isCacheHit = cacheStatus.toLowerCase().includes('hit');

  // Debug logging
  // console.log(`Cache Status: "${cacheStatus}", isCacheHit: ${isCacheHit}`);

  // Update cache metrics based on the actual response
  if (isCacheHit) {
    cacheHitCount.add(1);
    cacheHitRate.add(1); // This will calculate the rate correctly
  } else {
    cacheMissCount.add(1);
    cacheHitRate.add(0); // This will calculate the rate correctly
  }

  check(redirectResponse, {
    'URL redirect response time < 100ms': (r) => r.timings.duration < 100, // Hello Interview guide requirement
    'Cache hit response time < 50ms': (r) =>
      isCacheHit ? r.timings.duration < 50 : true,
    'Cache miss response time < 100ms': (r) =>
      !isCacheHit ? r.timings.duration < 100 : true,
  });
}
