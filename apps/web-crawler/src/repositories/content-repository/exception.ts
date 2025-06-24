export class ContentNotFoundException extends Error {
  constructor(key: string) {
    super(`Content not found for key: ${key}`);
    this.name = 'ContentNotFoundException';
  }
}
