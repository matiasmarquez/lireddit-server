import "reflect-metadata";
import { ApolloServer } from "apollo-server-express";
import express from "express";
import { MikroORM } from "mikro-orm";
import { buildSchema } from "type-graphql";
import ormConfig from "./mikro-orm.config";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";

const main = async () => {
	const orm = await MikroORM.init(ormConfig);
	await orm.getMigrator().up();

	const app = express();

	const apolloServer = new ApolloServer({
		schema: await buildSchema({
			resolvers: [HelloResolver, PostResolver, UserResolver],
			validate: false,
		}),
		context: () => ({ em: orm.em }),
	});

	apolloServer.applyMiddleware({ app });

	app.listen(4000, () => {
		console.log("server started on http://localhost:4000");
	});
};

main();
