import {
	Resolver,
	Ctx,
	Arg,
	Mutation,
	Field,
	ObjectType,
	Query,
} from "type-graphql";
import { MyContext } from "../types";
import { User } from "../entities/User";
import argon2 from "argon2";
import { COOKIE_NAME } from "../constants";
import { UsernamePasswordInput } from "./UsernamePasswordInput";
import { validateRegister } from "../utils/validateRegister";

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
		@Arg("data") { username, email, password }: UsernamePasswordInput,
		@Ctx() { em, req }: MyContext
	): Promise<UserResponse> {
		const alreadyExists = await em.findOne(User, { username });
		const errors = validateRegister({
			username,
			email,
			password,
			user: alreadyExists,
		});
		if (errors) {
			return { errors };
		}
		const hashedPassword = await argon2.hash(password);
		const user = em.create(User, {
			username,
			email,
			password: hashedPassword,
		});
		await em.persistAndFlush(user);

		req.session.userId = user.id;

		return { user };
	}

	@Mutation(() => UserResponse)
	async login(
		@Arg("usernameOrEmail") usernameOrEmail: string,
		@Arg("password") password: string,
		@Ctx() { em, req }: MyContext
	): Promise<UserResponse> {
		const user = await em.findOne(
			User,
			usernameOrEmail.includes("@")
				? { email: usernameOrEmail }
				: { username: usernameOrEmail }
		);
		if (!user) {
			return {
				errors: [
					{
						field: "usernameOrEmail",
						message: "that account doesn't exist",
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

	@Mutation(() => Boolean)
	logout(@Ctx() { req, res }: MyContext): Promise<Boolean> {
		return new Promise((resolve) => {
			req.session.destroy((err) => {
				res.clearCookie(COOKIE_NAME);
				if (err) {
					console.log(err);
					resolve(false);
					return;
				}
				resolve(true);
			});
		});
	}
}
