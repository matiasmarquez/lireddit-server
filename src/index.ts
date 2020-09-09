import { ApolloServer } from "apollo-server-express";
import connectRedis from "connect-redis";
import express from "express";
import session from "express-session";
import { MikroORM } from "mikro-orm";
import Redis from "ioredis";
import "reflect-metadata";
import { buildSchema } from "type-graphql";
import ormConfig from "./mikro-orm.config";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import cors from "cors";
import { COOKIE_NAME } from "./constants";

const main = async () => {
	const orm = await MikroORM.init(ormConfig);
	await orm.getMigrator().up();

	const app = express();

	const RedisStore = connectRedis(session);
	const redis = new Redis();

	app.use(
		cors({
			origin: "http://localhost:3000",
			credentials: true,
		})
	);

	app.use(
		session({
			name: COOKIE_NAME,
			store: new RedisStore({
				client: redis,
				disableTouch: true,
				disableTTL: true,
			}),
			cookie: {
				maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
				sameSite: "lax", // csrf
				httpOnly: true,
			},
			secret: "secret",
			saveUninitialized: false,
			resave: false,
		})
	);

	const apolloServer = new ApolloServer({
		schema: await buildSchema({
			resolvers: [HelloResolver, PostResolver, UserResolver],
			validate: false,
		}),
		context: ({ req, res }) => ({ em: orm.em, req, res, redis }),
	});

	apolloServer.applyMiddleware({
		app,
		cors: false,
	});

	app.listen(4000, () => {
		console.log("server started on http://localhost:4000");
	});
};

main();
