import { IdObfuscatorService } from './id-obfuscator.service';

const BASE = 62;
const MAX_POWER = 7;
const MAX_VALUE = Math.pow(BASE, MAX_POWER);

describe('IdObfuscatorService', () => {
  let service: IdObfuscatorService;

  beforeEach(() => {
    service = new IdObfuscatorService();
  });

  describe('Basic functionality', () => {
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
  });

  describe('Input validation', () => {
    const invalidInputs = [
      { value: 0, description: 'zero' },
      { value: -1, description: 'negative number' },
      { value: 1.5, description: 'non-integer' },
      { value: MAX_VALUE, description: 'equal to max value' },
      { value: MAX_VALUE + 1, description: 'greater than max value' },
      { value: Number.MAX_SAFE_INTEGER, description: 'MAX_SAFE_INTEGER' },
      { value: Number.MIN_SAFE_INTEGER, description: 'MIN_SAFE_INTEGER' },
      { value: Infinity, description: 'Infinity' },
      { value: -Infinity, description: '-Infinity' },
      { value: NaN, description: 'NaN' },
    ];

    describe('obfuscate', () => {
      it.each(invalidInputs)(
        'should throw error for $description',
        ({ value }) => {
          expect(() => service.obfuscate(value)).toThrow();
        }
      );
    });

    describe('deobfuscate', () => {
      it.each(invalidInputs)(
        'should throw error for $description',
        ({ value }) => {
          expect(() => service.deobfuscate(value)).toThrow();
        }
      );
    });
  });

  describe('Range tests', () => {
    describe('small numbers', () => {
      it('should be reversible for numbers from 1 to 1000', () => {
        for (let id = 1; id <= 1000; id++) {
          const obfuscated = service.obfuscate(id);
          const deobfuscated = service.deobfuscate(obfuscated);
          expect(deobfuscated).toBe(id);
        }
      });
    });

    describe('large numbers', () => {
      it('should be reversible for numbers near 62^7', () => {
        const start = MAX_VALUE - 1000;
        for (let id = start; id < MAX_VALUE; id++) {
          const obfuscated = service.obfuscate(id);
          const deobfuscated = service.deobfuscate(obfuscated);
          expect(deobfuscated).toBe(id);
        }
      });

      it('should be reversible for the largest valid number', () => {
        const id = MAX_VALUE - 1;
        const obfuscated = service.obfuscate(id);
        const deobfuscated = service.deobfuscate(obfuscated);
        expect(deobfuscated).toBe(id);
      });
    });
  });

  describe('Special number patterns', () => {
    describe('powers of 2', () => {
      const powersOf2 = Array.from({ length: 17 }, (_, i) =>
        Math.pow(2, i)
      ).filter((power) => power < MAX_VALUE);

      it.each(powersOf2)('should be reversible for 2^%d', (power) => {
        const obfuscated = service.obfuscate(power);
        const deobfuscated = service.deobfuscate(obfuscated);
        expect(deobfuscated).toBe(power);
      });
    });

    describe('powers of 62', () => {
      const powersOf62 = Array.from({ length: 7 }, (_, i) => Math.pow(62, i));

      it.each(powersOf62)('should be reversible for 62^%d', (power) => {
        const obfuscated = service.obfuscate(power);
        const deobfuscated = service.deobfuscate(obfuscated);
        expect(deobfuscated).toBe(power);
      });
    });

    describe('numbers near powers of 62', () => {
      const powersOf62 = Array.from({ length: 7 }, (_, i) => Math.pow(62, i));

      it.each(powersOf62)(
        'should be reversible for numbers near 62^%d',
        (power) => {
          const testNumbers = [power - 1, power + 1].filter(
            (n) => n > 0 && n < MAX_VALUE
          );
          for (const id of testNumbers) {
            const obfuscated = service.obfuscate(id);
            const deobfuscated = service.deobfuscate(obfuscated);
            expect(deobfuscated).toBe(id);
          }
        }
      );
    });
  });

  describe('Random number tests', () => {
    it('should be reversible for 1000 random numbers in valid range', () => {
      const randomNumbers = Array.from(
        { length: 1000 },
        () => Math.floor(Math.random() * (MAX_VALUE - 1)) + 1
      );

      for (const id of randomNumbers) {
        const obfuscated = service.obfuscate(id);
        const deobfuscated = service.deobfuscate(obfuscated);
        expect(deobfuscated).toBe(id);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle numbers just above 1', () => {
      const testNumbers = [1, 2, 3, 4, 5];
      for (const id of testNumbers) {
        const obfuscated = service.obfuscate(id);
        const deobfuscated = service.deobfuscate(obfuscated);
        expect(deobfuscated).toBe(id);
      }
    });

    it('should handle numbers just below MAX_VALUE', () => {
      const testNumbers = [
        MAX_VALUE - 5,
        MAX_VALUE - 4,
        MAX_VALUE - 3,
        MAX_VALUE - 2,
        MAX_VALUE - 1,
      ];
      for (const id of testNumbers) {
        const obfuscated = service.obfuscate(id);
        const deobfuscated = service.deobfuscate(obfuscated);
        expect(deobfuscated).toBe(id);
      }
    });
  });
});
