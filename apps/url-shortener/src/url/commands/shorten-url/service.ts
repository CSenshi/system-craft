import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BaseCommand, BaseDto } from '@libs/shared';
import { RedisCounterService } from '../../../counter/redis-counter.service';
import { IdObfuscatorService } from '../../app-services/id-obfuscator.service';
import { NumberHasherService } from '../../app-services/number-hasher.service';
import { UrlRepository } from '../../repositories/url.repository';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export class CommandOutput extends BaseDto<CommandOutput> {
  readonly shortUrl: string;
}

export class Command extends BaseCommand<Command, CommandOutput> {
  readonly url: string;
}

@CommandHandler(Command)
export class Service implements ICommandHandler<Command, CommandOutput> {
  private readonly logger = new Logger('ShortenUrl.Service');

  constructor(
    private readonly counterService: RedisCounterService,
    private readonly idObfuscatorService: IdObfuscatorService,
    private readonly numberHasherService: NumberHasherService,
    private readonly urlRepository: UrlRepository,
    private readonly configService: ConfigService
  ) {}

  async execute(cmd: Command): Promise<CommandOutput> {
    this.logger.debug({ msg: 'Shortening URL', url: cmd.url });
    const result = await this.getNextShortUrl();

    this.logger.debug({ msg: 'Generated short URL', shortUrl: result.url });
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
    const baseUrl = this.configService.get<string>(
      'SHORTENER_BASE_URL',
      'http://localhost:3000'
    );
    return `${baseUrl}/l/${encodedId}`;
  }
}
