import { Injectable } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';

/**
 * Service for identifying clients from HTTP requests.
 * Supports multiple identification strategies: user ID, IP address, API key.
 */
@Injectable()
export class ClientIdentifierService {
  /**
   * Extract client identifier from execution context.
   * Priority order:
   * 1. User ID from JWT token (if authenticated)
   * 2. API key from X-API-Key header
   * 3. IP address from request
   *
   * @param context - NestJS execution context
   * @returns Client identifier string (e.g., "user-id:123" or "ip:192.168.1.1") or null if unable to identify
   */
  identifyClient(context: ExecutionContext): string | null {
    const request = context.switchToHttp().getRequest();

    const toTry = [
      this.extractUserId.bind(this),
      this.extractApiKey.bind(this),
      this.extractIpAddress.bind(this),
    ];

    for (const attempt of toTry) {
      const value = attempt(request);
      if (value) return value;
    }

    return null;
  }

  /**
   * Extract user ID from JWT token in Authorization header.
   * This is a simplified implementation - in production, you'd decode and verify the JWT.
   */
  private extractUserId(request: any): string | null {
    const userId = request.headers?.['x-user-id'] as string;
    if (!userId) return null;
    return `user:${userId}`;
  }

  /**
   * Extract API key from X-API-Key header.
   */
  private extractApiKey(request: any): string | null {
    const apiKey = request.headers?.['x-api-key'] as string;
    if (!apiKey) return null;
    return `api:${apiKey}`;
  }

  /**
   * Extract IP address from request.
   * Checks X-Forwarded-For header first (for proxies/load balancers),
   * then falls back to request IP.
   */
  private extractIpAddress(request: any): string | null {
    // X-Forwarded-For can contain multiple IPs, take the first one
    const forwardedFor = request.headers?.['x-forwarded-for'] as string;
    if (forwardedFor) {
      const firstIp = forwardedFor.split(',')[0].trim();
      if (!firstIp) return null;
      return `ip:${firstIp}`;
    }

    // Fall back to request IP
    if (!request.ip && !request.socket?.remoteAddress) {
      return null;
    }

    return `ip:${request.ip || request.socket?.remoteAddress}`;
  }
}
