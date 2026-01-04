import axios from 'axios';

describe('Concurrent Requests', () => {
  it('handles concurrent requests', async () => {
    const userId = `user-${Date.now()}`;

    const batch1 = Array.from({ length: 5 }, () =>
      axios.get('/api/rate-limit/check/strict', {
        headers: { 'x-user-id': userId },
        validateStatus: () => true,
      }),
    );
    const results1 = await Promise.all(batch1);
    expect(results1.every((r) => r.status === 200)).toBe(true);

    const batch2 = Array.from({ length: 5 }, () =>
      axios.get('/api/rate-limit/check/strict', {
        headers: { 'x-user-id': userId },
        validateStatus: () => true,
      }),
    );
    const results2 = await Promise.all(batch2);
    expect(results2.every((r) => r.status === 200)).toBe(true);

    const final = await axios.get('/api/rate-limit/check/strict', {
      headers: { 'x-user-id': userId },
      validateStatus: () => true,
    });
    expect(final.status).toBe(429);
  });
});

describe('Basic Rate Limiting', () => {
  it('allows requests within limit', async () => {
    const userId = `user-${Date.now()}`;
    const res = await axios.get('/api/rate-limit/check/default', {
      headers: { 'x-user-id': userId },
    });

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ status: 'OK' });
  });

  it('denies requests over limit', async () => {
    const userId = `user-${Date.now()}`;
    const requests = Array.from({ length: 101 }, () =>
      axios.get('/api/rate-limit/check/default', {
        headers: { 'x-user-id': userId },
        validateStatus: () => true,
      }),
    );

    const results = await Promise.all(requests);
    const denied = results.filter((r) => r.status === 429);
    expect(denied.length).toBeGreaterThan(0);
  });

  it('tracks users independently', async () => {
    const user1 = `user1-${Date.now()}`;
    const user2 = `user2-${Date.now()}`;

    for (let i = 0; i < 100; i++) {
      await axios.get('/api/rate-limit/check/default', {
        headers: { 'x-user-id': user1 },
        validateStatus: () => true,
      });
    }

    const res = await axios.get('/api/rate-limit/check/default', {
      headers: { 'x-user-id': user2 },
    });

    expect(res.status).toBe(200);
  });

  it('enforces strict rule correctly', async () => {
    const userId = `user-${Date.now()}`;

    for (let i = 0; i < 10; i++) {
      const res = await axios.get('/api/rate-limit/check/strict', {
        headers: { 'x-user-id': userId },
      });
      expect(res.status).toBe(200);
    }

    try {
      await axios.get('/api/rate-limit/check/strict', {
        headers: { 'x-user-id': userId },
      });
      fail('should return 429');
    } catch (error) {
      expect(
        (error as { response?: { status: number } }).response?.status,
      ).toBe(429);
    }
  });

  it('uses api-requests rule', async () => {
    const userId = `user-${Date.now()}`;
    const res = await axios.get('/api/rate-limit/check/api-requests', {
      headers: { 'x-user-id': userId },
    });

    expect(res.status).toBe(200);
    expect(res.headers['x-ratelimit-limit']).toBe('1000');
  });
});

describe('Rate Limit Headers', () => {
  it('includes all required headers', async () => {
    const userId = `user-${Date.now()}`;
    const res = await axios.get('/api/rate-limit/check/default', {
      headers: { 'x-user-id': userId },
    });

    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
    expect(res.headers['x-ratelimit-reset']).toBeDefined();
  });

  it('returns correct limit values', async () => {
    const userId = `user-${Date.now()}`;
    const res = await axios.get('/api/rate-limit/check/strict', {
      headers: { 'x-user-id': userId },
    });

    expect(res.headers['x-ratelimit-limit']).toBe('10');
    expect(parseInt(res.headers['x-ratelimit-remaining'])).toBe(9);
  });

  it('decrements remaining count', async () => {
    const userId = `user-${Date.now()}`;

    const res1 = await axios.get('/api/rate-limit/check/strict', {
      headers: { 'x-user-id': userId },
    });
    const remaining1 = parseInt(res1.headers['x-ratelimit-remaining']);

    const res2 = await axios.get('/api/rate-limit/check/strict', {
      headers: { 'x-user-id': userId },
    });
    const remaining2 = parseInt(res2.headers['x-ratelimit-remaining']);

    expect(remaining2).toBe(remaining1 - 1);
  });
});

describe('429 Too Many Requests', () => {
  it('returns 429 with error structure', async () => {
    const userId = `user-${Date.now()}`;

    for (let i = 0; i < 10; i++) {
      await axios.get('/api/rate-limit/check/strict', {
        headers: { 'x-user-id': userId },
        validateStatus: () => true,
      });
    }

    try {
      await axios.get('/api/rate-limit/check/strict', {
        headers: { 'x-user-id': userId },
      });
      fail('should return 429');
    } catch (error) {
      const err = error as {
        response?: {
          status: number;
          data: { statusCode: number; message: string; rateLimit: unknown };
        };
      };
      expect(err.response?.status).toBe(429);
      expect(err.response?.data.statusCode).toBe(429);
      expect(err.response?.data.message).toBeDefined();
      expect(err.response?.data.rateLimit).toBeDefined();
    }
  });

  it('includes headers in 429 response', async () => {
    const userId = `user-${Date.now()}`;

    for (let i = 0; i < 10; i++) {
      await axios.get('/api/rate-limit/check/strict', {
        headers: { 'x-user-id': userId },
        validateStatus: () => true,
      });
    }

    try {
      await axios.get('/api/rate-limit/check/strict', {
        headers: { 'x-user-id': userId },
      });
      fail('should return 429');
    } catch (error) {
      const err = error as {
        response?: { status: number; headers: Record<string, string> };
      };
      expect(err.response?.status).toBe(429);
      expect(err.response?.headers['x-ratelimit-limit']).toBe('10');
      expect(err.response?.headers['x-ratelimit-remaining']).toBe('0');
    }
  });
});

describe('Client Identification', () => {
  it('identifies by user ID', async () => {
    const userId = `user-${Date.now()}`;

    for (let i = 0; i < 10; i++) {
      await axios.get('/api/rate-limit/check/strict', {
        headers: { 'x-user-id': userId },
      });
    }

    try {
      await axios.get('/api/rate-limit/check/strict', {
        headers: { 'x-user-id': userId },
      });
      fail('should be denied');
    } catch (error) {
      const err = error as { response?: { status: number } };
      expect(err.response?.status).toBe(429);
    }
  });

  it('identifies by API key', async () => {
    const apiKey = `key-${Date.now()}`;

    for (let i = 0; i < 10; i++) {
      await axios.get('/api/rate-limit/check/strict', {
        headers: { 'x-api-key': apiKey },
      });
    }

    try {
      await axios.get('/api/rate-limit/check/strict', {
        headers: { 'x-api-key': apiKey },
      });
      fail('should be denied');
    } catch (error) {
      const err = error as { response?: { status: number } };
      expect(err.response?.status).toBe(429);
    }
  });

  it('identifies by IP', async () => {
    const res = await axios.get('/api/rate-limit/check/strict', {
      headers: { 'x-forwarded-for': randomIpAddress() },
    });

    expect(res.status).toBe(200);
  });

  it('prioritizes user ID over API key', async () => {
    const userId = `user-${Date.now()}`;
    const apiKey = `key-${Date.now()}`;

    await axios.get('/api/rate-limit/check/strict', {
      headers: { 'x-user-id': userId, 'x-api-key': apiKey },
    });

    for (let i = 0; i < 9; i++) {
      await axios.get('/api/rate-limit/check/strict', {
        headers: { 'x-user-id': userId, 'x-api-key': `other-${i}` },
      });
    }

    try {
      await axios.get('/api/rate-limit/check/strict', {
        headers: { 'x-user-id': userId, 'x-api-key': apiKey },
      });
      fail('should be denied');
    } catch (error) {
      const err = error as { response?: { status: number } };
      expect(err.response?.status).toBe(429);
    }
  });
});

function randomIpAddress(): string {
  const octests = Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 255),
  );

  return octests.join('.');
}
