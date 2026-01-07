import axios from 'axios';

describe('Load Tests', () => {
  it('handles many concurrent clients', async () => {
    const clients = Array.from({ length: 20 }, (_, i) => ({
      userId: `client-${Date.now()}-${i}`,
    }));

    const requests = clients.flatMap((client) =>
      Array.from({ length: 15 }, () =>
        axios.get('/api/rate-limit/check/strict', {
          headers: { 'x-user-id': client.userId },
          validateStatus: () => true,
        }),
      ),
    );

    const results = await Promise.all(requests);
    const allowed = results.filter((r) => r.status === 200).length;
    const denied = results.filter((r) => r.status === 429).length;

    expect(allowed).toBe(200); // 20 clients * 10 allowed
    expect(denied).toBe(100); // 20 clients * 5 denied
  }, 60000);

  it('maintains accuracy under rapid concurrent requests', async () => {
    const userId = `user-${Date.now()}`;
    const requests = Array.from({ length: 50 }, () =>
      axios.get('/api/rate-limit/check/strict', {
        headers: { 'x-user-id': userId },
        validateStatus: () => true,
      }),
    );

    const results = await Promise.all(requests);
    const allowed = results.filter((r) => r.status === 200).length;
    const denied = results.filter((r) => r.status === 429).length;

    expect(allowed).toBe(10);
    expect(denied).toBe(40);
  }, 30000);

  it('handles mixed identification methods', async () => {
    const users = Array.from({ length: 10 }, (_, i) => ({
      header: { 'x-user-id': `user-${Date.now()}-${i}` },
    }));
    const apis = Array.from({ length: 10 }, (_, i) => ({
      header: { 'x-api-key': `key-${Date.now()}-${i}` },
    }));
    const ips = Array.from({ length: 10 }, (_, i) => ({
      header: { 'x-forwarded-for': randomIpAddress() },
    }));

    const allClients = [...users, ...apis, ...ips];
    const requests = allClients.flatMap((client) =>
      Array.from({ length: 12 }, () =>
        axios.get('/api/rate-limit/check/strict', {
          headers: client.header,
          validateStatus: () => true,
        }),
      ),
    );

    const results = await Promise.all(requests);
    const allowed = results.filter((r) => r.status === 200).length;
    const denied = results.filter((r) => r.status === 429).length;

    expect(allowed).toBe(300); // 30 clients * 10
    expect(denied).toBe(60); // 30 clients * 2
  }, 60000);

  it('handles burst then sustained traffic', async () => {
    const userId = `user-${Date.now()}`;

    const burst = Array.from({ length: 20 }, () =>
      axios.get('/api/rate-limit/check/strict', {
        headers: { 'x-user-id': userId },
        validateStatus: () => true,
      }),
    );
    const burstResults = await Promise.all(burst);
    expect(burstResults.filter((r) => r.status === 200).length).toBe(10);
    expect(burstResults.filter((r) => r.status === 429).length).toBe(10);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const sustained: Array<{ status: number }> = [];
    for (let i = 0; i < 5; i++) {
      const res = await axios.get('/api/rate-limit/check/strict', {
        headers: { 'x-user-id': userId },
        validateStatus: () => true,
      });
      sustained.push(res);
    }

    expect(sustained.every((r) => r.status === 429)).toBe(true);
  }, 30000);

  it('maintains performance under load', async () => {
    const clients = Array.from({ length: 5 }, (_, i) => ({
      userId: `perf-${Date.now()}-${i}`,
    }));

    const start = Date.now();
    const requests = clients.flatMap((client) =>
      Array.from({ length: 10 }, () =>
        axios.get('/api/rate-limit/check/strict', {
          headers: { 'x-user-id': client.userId },
          validateStatus: () => true,
        }),
      ),
    );
    const results = await Promise.all(requests);
    const duration = Date.now() - start;

    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(duration).toBeLessThan(10000);
    expect(duration / results.length).toBeLessThan(1000);
  }, 30000);
});

function randomIpAddress(): string {
  const octests = Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 255),
  );

  return octests.join('.');
}
