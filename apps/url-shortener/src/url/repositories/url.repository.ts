import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UrlNotFoundExceptions } from '../exceptions/url.exceptions';

@Injectable()
export class UrlRepository {
  constructor(private readonly prisma: PrismaService) {}

  async saveUrlMapping(id: number, url: string): Promise<void> {
    await this.prisma.shortendUrls.create({
      data: { id, url },
    });
  }

  async getUrlById(obfuscatedId: number): Promise<string> {
    const result = await this.prisma.shortendUrls.findUnique({
      where: { id: obfuscatedId },
      select: { url: true },
    });

    if (!result) {
      throw new UrlNotFoundExceptions();
    }

    return result.url;
  }
}
