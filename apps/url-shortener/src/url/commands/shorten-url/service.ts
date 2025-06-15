import { CommandHandler } from '@nestjs/cqrs';
import { BaseCommand, BaseDto } from '@libs/shared';
import { RedisCounterService } from '../../../counter/redis-counter.service';
import { IdObfuscatorService } from '../../app-services/id-obfuscator.service';
import { NumberHasherService } from '../../app-services/number-hasher.service';
import { UrlRepository } from '../../repositories/url.repository';

export class CommandOutput extends BaseDto<CommandOutput> {
  readonly shortUrl: string;
}

export class Command extends BaseCommand<Command, CommandOutput> {
  readonly url: string;
}

@CommandHandler(Command)
export class Service {
  constructor(
    private readonly counterService: RedisCounterService,
    private readonly idObfuscatorService: IdObfuscatorService,
    private readonly numberHasherService: NumberHasherService,
    private readonly urlRepository: UrlRepository
  ) {}

  async execute(cmd: Command): Promise<CommandOutput> {
    const result = await this.getNextShortUrl();

    await this.urlRepository.saveUrlMapping(result.id, cmd.url);

    return new CommandOutput({
      shortUrl: result.url,
    });
  }

  private async getNextShortUrl(): Promise<{ url: string; id: number }> {
    const currentCounter = await this.counterService.getNextCount();
    const obfuscatedId = this.idObfuscatorService.obfuscate(currentCounter);
    const encodedId = this.numberHasherService.encode(obfuscatedId, 7);

    return { id: currentCounter, url: this.generateShortUrl(encodedId) };
  }

  private generateShortUrl(encodedId: string): string {
    const baseUrl = process.env.SHORTENER_BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/${encodedId}`;
  }
}
