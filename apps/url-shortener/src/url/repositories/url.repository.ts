import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UrlRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Example method to save a URL
  async saveUrlMapping(id: number, url: string): Promise<void> {
    await this.prisma.shortendUrls.create({
      data: { id, url },
    });
  }
}
