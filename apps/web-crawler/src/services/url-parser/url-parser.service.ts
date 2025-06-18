import { BaseCommand } from '@libs/shared';

export class Command extends BaseCommand<Command> {
  readonly url: string;
}

export class UrlParserService {
  async execute(cmd: Command) {
    // 1. resolve DNS
    //
  }
}
