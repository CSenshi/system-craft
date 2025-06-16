/**
 * Implements a Multiplicative Cipher for ID obfuscation.
 *
 * Key Properties:
 * - Range: 0 < id < 62^7 (≈3.52e12)
 * - Bijective: each input maps to unique output in the same range (0 < obfuscatedId < 62^7)
 * - Reversible: deobfuscate(obfuscate(id)) = id
 *
 * Uses modular arithmetic: id * SECRET mod MaxValue.
 *                  where: SECRET and MaxValue must be coprime
 *                   i.e. gcd(SECRET, MaxValue) = 1
 *
 * For detailed explanation of the algorithm and its mathematical properties:
 * https://www.geeksforgeeks.org/computer-networks/what-is-multiplicative-cipher-in-cryptography
 */
export class IdObfuscatorService {
  private readonly MaxValue = 62n ** 7n; // 62^7
  private readonly SECRET = 6364136223846793005n;
  private readonly INVERSE = this.modInverse(this.SECRET, this.MaxValue);

  obfuscate(id: number): number {
    if (!Number.isInteger(id) || id <= 0 || id >= Number(this.MaxValue)) {
      throw new Error(
        `id must be an integer in the range 0 < id < ${this.MaxValue.toString()}`
      );
    }
    return Number((BigInt(id) * this.SECRET) % this.MaxValue);
  }

  deobfuscate(obfuscatedId: number): number {
    if (
      !Number.isInteger(obfuscatedId) ||
      obfuscatedId <= 0 ||
      obfuscatedId >= Number(this.MaxValue)
    ) {
      throw new Error(
        `obfuscatedId must be an integer in the range 0 < obfuscatedId < ${this.MaxValue.toString()}`
      );
    }
    return Number((BigInt(obfuscatedId) * this.INVERSE) % this.MaxValue);
  }

  private modInverse(a: bigint, m: bigint): bigint {
    let [oldR, r] = [a, m];
    let [oldS, s] = [1n, 0n];
    while (r !== 0n) {
      const quotient = oldR / r;
      [oldR, r] = [r, oldR - quotient * r];
      [oldS, s] = [s, oldS - quotient * s];
    }
    if (oldS < 0n) oldS += m;
    return oldS;
  }
}
