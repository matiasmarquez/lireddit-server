import { EntityManager, IDatabaseDriver, Connection } from "mikro-orm";
import { Request, Response } from "express";
import { Redis } from "ioredis";

export type MyContext = {
	em: EntityManager<IDatabaseDriver<Connection>>;
	req: Request & { session: Express.Session };
	res: Response;
	redis: Redis;
};
