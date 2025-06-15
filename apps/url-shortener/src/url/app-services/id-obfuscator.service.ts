export class IdObfuscatorService {
  private readonly secretNumber = BigInt(0x5a17f);

  obfuscate(id: number): number {
    return Number(BigInt(id) ^ this.secretNumber);
  }

  deobfuscate(obfuscatedId: number): number {
    return Number(BigInt(obfuscatedId) ^ this.secretNumber);
  }
}
