import {
	Resolver,
	Ctx,
	Arg,
	Mutation,
	InputType,
	Field,
	ObjectType,
	Query,
} from "type-graphql";
import { MyContext } from "src/types";
import { User } from "../entities/User";
import argon2 from "argon2";

@InputType()
class UsernamePasswordInput {
	@Field()
	username: string;

	@Field()
	password: string;
}

@ObjectType()
class FieldError {
	@Field()
	field: string;

	@Field()
	message: string;
}

@ObjectType()
class UserResponse {
	@Field(() => [FieldError], { nullable: true })
	errors?: FieldError[];

	@Field({ nullable: true })
	user?: User;
}

@Resolver()
export class UserResolver {
	@Query(() => User, { nullable: true })
	async me(@Ctx() { req, em }: MyContext): Promise<User | null> {
		if (!req.session.userId) {
			return null;
		}
		return await em.findOne(User, { id: req.session.userId });
	}

	@Mutation(() => UserResponse)
	async register(
		@Arg("data") { username, password }: UsernamePasswordInput,
		@Ctx() { em }: MyContext
	): Promise<UserResponse> {
		const alreadyExists = await em.findOne(User, { username });
		if (alreadyExists) {
			return {
				errors: [
					{
						field: "username",
						message: "username already taken",
					},
				],
			};
		}
		const hashedPassword = await argon2.hash(password);
		const user = em.create(User, { username, password: hashedPassword });
		await em.persistAndFlush(user);
		return { user };
	}

	@Mutation(() => UserResponse)
	async login(
		@Arg("data") { username, password }: UsernamePasswordInput,
		@Ctx() { em, req }: MyContext
	): Promise<UserResponse> {
		const user = await em.findOne(User, { username });
		if (!user) {
			return {
				errors: [
					{
						field: "username",
						message: "that username doesn't exist",
					},
				],
			};
		}
		const valid = await argon2.verify(user.password, password);
		if (!valid) {
			return {
				errors: [
					{
						field: "password",
						message: "incorrect password",
					},
				],
			};
		}

		req.session.userId = user.id;

		return { user };
	}
}
