import { MikroORM } from "mikro-orm";
import path from "path";
import { __prod__ } from "./constants";
import { Post } from "./entities/Post";
import { User } from "./entities/User";

export default {
	entities: [Post, User],
	dbName: "litreddit",
	type: "mariadb",
	user: "root",
	password: "tAJRd21_Dx",
	migrations: {
		path: path.join(__dirname, "./migrations"),
		pattern: /^[\w-]+\d+\.[tj]s$/,
	},
	debug: !__prod__,
} as Parameters<typeof MikroORM.init>[0];
