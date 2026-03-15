import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BaseCommand, BaseDto } from '@libs/shared';
import { KafkaProducer } from '../../infrastructure/kafka.producer';

export class CommandOutput extends BaseDto<CommandOutput> {}

export class Command extends BaseCommand<Command, CommandOutput> {
  readonly adId: string;
  readonly userId: string;
  readonly timestamp: string;
}

@CommandHandler(Command)
export class Service implements ICommandHandler<Command, CommandOutput> {
  private readonly logger = new Logger('RecordClick.Service');

  constructor(private readonly kafkaProducer: KafkaProducer) {}

  async execute(cmd: Command): Promise<CommandOutput> {
    this.logger.debug({ msg: 'Recording click', adId: cmd.adId });

    await this.kafkaProducer.publish('ad-clicks', {
      // Partition key is adId so all events for the same ad land on the same partition.
      // Hot ad mitigation (AdId:0-N suffix) would be applied here for viral ads.
      key: cmd.adId,
      value: JSON.stringify({
        adId: cmd.adId,
        userId: cmd.userId,
        timestamp: cmd.timestamp,
      }),
    });

    return new CommandOutput({});
  }
}
