import { InvalidCharacterError } from '../exceptions/url.exceptions';

export class NumberHasherService {
  readonly ALPHABET =
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  private readonly BASE = this.ALPHABET.length;

  // round to 7 characters
  public encode(number: number, charCount: number): string {
    if (number < 0) {
      throw new Error('Negative numbers are not supported.');
    }

    if (number >= Math.pow(this.BASE, charCount)) {
      throw new Error(
        `Number ${number} is too large to encode with a length of ${charCount} characters.`,
      );
    }
    if (number === 0) return this.ALPHABET[0];

    let encoded = '';
    while (number > 0) {
      encoded = this.ALPHABET[number % this.BASE] + encoded;
      number = Math.floor(number / this.BASE);
    }
    // Pad with leading zeros to ensure a minimum length of 7 characters
    while (encoded.length < charCount) {
      encoded = this.ALPHABET[0] + encoded;
    }
    return encoded;
  }

  public decode(encoded: string): number {
    let number = 0;
    for (let i = 0; i < encoded.length; i++) {
      const char = encoded[i];
      const index = this.ALPHABET.indexOf(char);

      if (index === -1) {
        throw new InvalidCharacterError();
      }
      number = number * this.BASE + index;
    }
    return number;
  }
}
