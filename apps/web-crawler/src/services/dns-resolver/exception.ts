export class DnsCanNotResolveError extends Error {
  constructor(hostname: string, message?: string) {
    super(message || `Could not resolve DNS for hostname: ${hostname}`);
    this.name = 'DnsCanNotResolveError';
  }
}

export class InvalidHostnameError extends Error {
  constructor(hostname: string, message?: string) {
    super(message || `Invalid hostname: ${hostname}`);
    this.name = 'InvalidHostnameError';
  }
}
