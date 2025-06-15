import { IdObfuscatorService } from './id-obfuscator.service';

describe('IdObfuscatorService', () => {
  let service: IdObfuscatorService;

  beforeEach(() => {
    service = new IdObfuscatorService();
  });

  it('should obfuscate and deobfuscate the same id', () => {
    const id = 123456;
    const obfuscated = service.obfuscate(id);
    const deobfuscated = service.deobfuscate(obfuscated);
    expect(deobfuscated).toBe(id);
  });

  it('should return different value for obfuscated id', () => {
    const id = 42;
    const obfuscated = service.obfuscate(id);
    expect(obfuscated).not.toBe(id);
  });

  it('should handle zero', () => {
    const id = 0;
    const obfuscated = service.obfuscate(id);
    const deobfuscated = service.deobfuscate(obfuscated);
    expect(deobfuscated).toBe(id);
  });

  it('should handle negative numbers', () => {
    const id = -100;
    const obfuscated = service.obfuscate(id);
    const deobfuscated = service.deobfuscate(obfuscated);
    expect(deobfuscated).toBe(id);
  });

  it('should be reversible for large numbers', () => {
    const id = Number.MAX_SAFE_INTEGER;
    const obfuscated = service.obfuscate(id);
    const deobfuscated = service.deobfuscate(obfuscated);
    expect(deobfuscated).toBe(id);
  });

  it('should be reversible for 62^8 and similar large numbers', () => {
    const testNumbers = [
      Math.pow(62, 8), // 62^7
      Math.pow(62, 7), // 62^7
      Math.pow(62, 6), // 62^6
      Math.pow(62, 8), // 62^8
      Math.pow(62, 5), // 62^5
      9876543210987, // arbitrary large number
    ];

    for (const id of testNumbers) {
      const obfuscated = service.obfuscate(id);
      const deobfuscated = service.deobfuscate(obfuscated);
      expect(deobfuscated).toBe(id);
    }
  });

  it('should be reversible for 1000 big random numbers', () => {
    for (let i = 0; i < 1000; i++) {
      // Generate a random big integer within safe integer range
      const id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
      const obfuscated = service.obfuscate(id);
      const deobfuscated = service.deobfuscate(obfuscated);
      expect(deobfuscated).toBe(id);
    }
  });
});
