import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { BaseQuery, BaseDto } from '@libs/shared';
import { IdObfuscatorService } from '../../app-services/id-obfuscator.service';
import { NumberHasherService } from '../../app-services/number-hasher.service';
import { UrlRepository } from '../../repositories/url.repository';
import { Logger } from '@nestjs/common';

export class QueryOutput extends BaseDto<QueryOutput> {
  readonly url: string;
}

export class Query extends BaseQuery<Query, QueryOutput> {
  readonly shortUrlId: string;
}

@QueryHandler(Query)
export class Service implements IQueryHandler<Query, QueryOutput> {
  private readonly logger = new Logger('GetRealUrl.Service');

  constructor(
    private readonly idObfuscatorService: IdObfuscatorService,
    private readonly numberHasherService: NumberHasherService,
    private readonly urlRepository: UrlRepository
  ) { }

  async execute(cmd: Query): Promise<QueryOutput> {
    this.logger.debug({ msg: 'Retrieving real URL for shortUrlId', shortUrlId: cmd.shortUrlId, });

    const id = this.numberHasherService.decode(cmd.shortUrlId);
    const obfuscatedId = this.idObfuscatorService.deobfuscate(id);

    this.logger.debug({ msg: 'Deobfuscated ID', obfuscatedId: obfuscatedId });
    const url = await this.urlRepository.getUrlById(obfuscatedId);

    return new QueryOutput({
      url: url,
    });
  }
}
