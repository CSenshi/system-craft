import { NumberHasherService } from './number-hasher.service';

describe('NumberHasherService', () => {
  let service: NumberHasherService;

  beforeEach(() => {
    service = new NumberHasherService();
  });

  it('should encode and decode the same number', () => {
    const number = 123456;
    const encoded = service.encode(number, 7);
    const decoded = service.decode(encoded);
    expect(decoded).toBe(number);
  });

  it('should return different value for encoded number', () => {
    const number = 42;
    const encoded = service.encode(number, 7);
    expect(encoded).not.toBe(number.toString());
  });

  it('should handle zero', () => {
    const number = 0;
    const encoded = service.encode(number, 7);
    const decoded = service.decode(encoded);
    expect(decoded).toBe(number);
  });

  it('should handle negative numbers (should throw)', () => {
    expect(() => service.encode(-100, 7)).toThrow();
  });

  it('should be reversible for large numbers', () => {
    const number = Number.MAX_SAFE_INTEGER;
    const encoded = service.encode(number, 10);
    const decoded = service.decode(encoded);
    expect(decoded).toBe(number);
  });

  it('should be reversible for 62^7 and similar large numbers', () => {
    const testNumbers = [Math.pow(62, 7) - 1, Math.pow(62, 6), Math.pow(62, 5)];
    for (const number of testNumbers) {
      const encoded = service.encode(number, 7);
      const decoded = service.decode(encoded);
      expect(decoded).toBe(number);
    }
  });

  it('should be reversible for 1000 big random numbers', () => {
    for (let i = 0; i < 1000; i++) {
      const number = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
      const encoded = service.encode(number, 9);
      const decoded = service.decode(encoded);
      expect(decoded).toBe(number);
    }
  });

  it('should throw on invalid characters in decode', () => {
    expect(() => service.decode('!@#$%^')).toThrow();
  });

  it('should throw if character length is not enough for encoding', () => {
    expect(() => service.encode(Math.pow(62, 7), 2)).toThrow();
    expect(() => service.encode(Math.pow(62, 7), 3)).toThrow();
    expect(() => service.encode(Math.pow(62, 7), 4)).toThrow();
    expect(() => service.encode(Math.pow(62, 7), 7)).toThrow();
  });
});
