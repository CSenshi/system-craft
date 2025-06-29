export class ContentAlreadyDiscoveredException extends Error {
  constructor(url: string) {
    super(`Content for URL ${url} has already been processed.`);
    this.name = 'ContentAlreadyDiscoveredException';
  }
}
