import { CommandHandler } from "@nestjs/cqrs";
import { BaseCommand, BaseDto } from "@libs/shared";

export class CommandOutput extends BaseDto<CommandOutput> {
	readonly shortUrl: string;
}

export class Command extends BaseCommand<Command, CommandOutput> {
	readonly url: string;
}

@CommandHandler(Command)
export class Service {
	public execute(cmd: Command): CommandOutput {
		// ToDo: Implement URL shortening logic
		return new CommandOutput({
			shortUrl: cmd.url
		})
	}

}
