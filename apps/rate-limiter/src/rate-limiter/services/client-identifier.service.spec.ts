import { ExecutionContext } from '@nestjs/common';
import { ClientIdentifierService } from './client-identifier.service';

function createMockContext(request: Record<string, any>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('ClientIdentifierService', () => {
  let service: ClientIdentifierService;

  beforeEach(() => {
    service = new ClientIdentifierService();
  });

  describe('identifyClient', () => {
    describe('priority order', () => {
      it('should prefer X-User-ID over X-API-Key and IP', () => {
        const ctx = createMockContext({
          headers: {
            'x-user-id': 'user-123',
            'x-api-key': 'key-456',
            'x-forwarded-for': '10.0.0.1',
          },
          ip: '192.168.1.1',
        });

        expect(service.identifyClient(ctx)).toBe('user:user-123');
      });

      it('should prefer X-API-Key over IP when no user ID', () => {
        const ctx = createMockContext({
          headers: {
            'x-api-key': 'key-456',
            'x-forwarded-for': '10.0.0.1',
          },
          ip: '192.168.1.1',
        });

        expect(service.identifyClient(ctx)).toBe('api:key-456');
      });

      it('should fall back to IP when no user ID or API key', () => {
        const ctx = createMockContext({
          headers: {},
          ip: '192.168.1.1',
        });

        expect(service.identifyClient(ctx)).toBe('ip:192.168.1.1');
      });
    });

    describe('user ID extraction', () => {
      it('should return user:<id> from X-User-ID header', () => {
        const ctx = createMockContext({
          headers: { 'x-user-id': 'abc-123' },
        });

        expect(service.identifyClient(ctx)).toBe('user:abc-123');
      });
    });

    describe('API key extraction', () => {
      it('should return api:<key> from X-API-Key header', () => {
        const ctx = createMockContext({
          headers: { 'x-api-key': 'sk-test-key' },
        });

        expect(service.identifyClient(ctx)).toBe('api:sk-test-key');
      });
    });

    describe('IP extraction', () => {
      it('should use first IP from X-Forwarded-For', () => {
        const ctx = createMockContext({
          headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2, 10.0.0.3' },
        });

        expect(service.identifyClient(ctx)).toBe('ip:10.0.0.1');
      });

      it('should trim whitespace from X-Forwarded-For IP', () => {
        const ctx = createMockContext({
          headers: { 'x-forwarded-for': '  10.0.0.1  , 10.0.0.2' },
        });

        expect(service.identifyClient(ctx)).toBe('ip:10.0.0.1');
      });

      it('should fall back to request.ip', () => {
        const ctx = createMockContext({
          headers: {},
          ip: '172.16.0.1',
        });

        expect(service.identifyClient(ctx)).toBe('ip:172.16.0.1');
      });

      it('should fall back to request.socket.remoteAddress', () => {
        const ctx = createMockContext({
          headers: {},
          socket: { remoteAddress: '::1' },
        });

        expect(service.identifyClient(ctx)).toBe('ip:::1');
      });
    });

    describe('null cases', () => {
      it('should return null when no identification method succeeds', () => {
        const ctx = createMockContext({
          headers: {},
        });

        expect(service.identifyClient(ctx)).toBeNull();
      });

      it('should return null for empty X-Forwarded-For with no other sources', () => {
        const ctx = createMockContext({
          headers: { 'x-forwarded-for': '' },
        });

        expect(service.identifyClient(ctx)).toBeNull();
      });
    });
  });
});
