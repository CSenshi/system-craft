import { QueryHandler } from "@nestjs/cqrs";
import { BaseQuery, BaseDto } from "@libs/shared";

export class QueryOutput extends BaseDto<QueryOutput> {
	readonly url: string;
}

export class Query extends BaseQuery<Query, QueryOutput> {
	readonly shortUrlId: string;
}

@QueryHandler(Query)
export class Service {
	public execute(cmd: Query): QueryOutput {
		// ToDo: Implement URL shortening logic
		return new QueryOutput({
			url: cmd.shortUrlId
		})
	}

}
