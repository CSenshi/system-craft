import { ToxiproxyClient } from './client.js';
import type { Proxy, Toxic } from './types.js';

const mockProxy: Proxy = {
  name: 'test-redis',
  listen: '0.0.0.0:6380',
  upstream: 'redis:6379',
  enabled: true,
  toxics: [],
};

const mockToxic: Toxic = {
  name: 'latency_downstream',
  type: 'latency',
  stream: 'downstream',
  toxicity: 1.0,
  attributes: { latency: 500, jitter: 100 },
};

describe('ToxiproxyClient', () => {
  let client: ToxiproxyClient;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    client = new ToxiproxyClient('http://localhost:8474');
    fetchSpy = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  function mockFetchResponse(body: unknown, status = 200): void {
    fetchSpy.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    } as Response);
  }

  function mockFetchNoContent(): void {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: () => Promise.resolve(undefined),
      text: () => Promise.resolve(''),
    } as Response);
  }

  describe('createProxy', () => {
    it('should POST to /proxies with the config', async () => {
      mockFetchResponse(mockProxy);

      const result = await client.createProxy({
        name: 'test-redis',
        listen: '0.0.0.0:6380',
        upstream: 'redis:6379',
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:8474/proxies',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'test-redis',
            listen: '0.0.0.0:6380',
            upstream: 'redis:6379',
          }),
        }),
      );
      expect(result).toEqual(mockProxy);
    });
  });

  describe('getProxy', () => {
    it('should GET /proxies/:name', async () => {
      mockFetchResponse(mockProxy);

      const result = await client.getProxy('test-redis');

      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:8474/proxies/test-redis',
        expect.objectContaining({ headers: expect.any(Object) }),
      );
      expect(result).toEqual(mockProxy);
    });
  });

  describe('disableProxy', () => {
    it('should PATCH with enabled: false', async () => {
      mockFetchResponse({ ...mockProxy, enabled: false });

      const result = await client.disableProxy('test-redis');

      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:8474/proxies/test-redis',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ enabled: false }),
        }),
      );
      expect(result.enabled).toBe(false);
    });
  });

  describe('enableProxy', () => {
    it('should PATCH with enabled: true', async () => {
      mockFetchResponse(mockProxy);

      const result = await client.enableProxy('test-redis');

      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:8474/proxies/test-redis',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ enabled: true }),
        }),
      );
      expect(result.enabled).toBe(true);
    });
  });

  describe('addToxic', () => {
    it('should POST toxic config with defaults', async () => {
      mockFetchResponse(mockToxic);

      const result = await client.addToxic('test-redis', {
        name: 'latency_downstream',
        type: 'latency',
        attributes: { latency: 500, jitter: 100 },
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:8474/proxies/test-redis/toxics',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'latency_downstream',
            type: 'latency',
            attributes: { latency: 500, jitter: 100 },
            stream: 'downstream',
            toxicity: 1.0,
          }),
        }),
      );
      expect(result).toEqual(mockToxic);
    });
  });

  describe('removeToxic', () => {
    it('should DELETE /proxies/:name/toxics/:toxicName', async () => {
      mockFetchNoContent();

      await client.removeToxic('test-redis', 'latency_downstream');

      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:8474/proxies/test-redis/toxics/latency_downstream',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('reset', () => {
    it('should POST to /reset', async () => {
      mockFetchNoContent();

      await client.reset();

      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:8474/reset',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('resetProxy', () => {
    it('should remove all toxics and re-enable the proxy', async () => {
      // getToxics response
      mockFetchResponse([mockToxic]);
      // removeToxic response
      mockFetchNoContent();
      // enableProxy response
      mockFetchResponse(mockProxy);

      await client.resetProxy('test-redis');

      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('isHealthy', () => {
    it('should return true when API is reachable', async () => {
      fetchSpy.mockResolvedValueOnce({ ok: true } as Response);

      const result = await client.isHealthy();
      expect(result).toBe(true);
    });

    it('should return false when API is unreachable', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const result = await client.isHealthy();
      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should throw with status and body on non-OK response', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('proxy not found'),
      } as unknown as Response);

      await expect(client.getProxy('missing')).rejects.toThrow(
        'Toxiproxy GET /proxies/missing failed (404): proxy not found',
      );
    });
  });
});
