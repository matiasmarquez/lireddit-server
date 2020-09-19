import {
	Resolver,
	Ctx,
	Arg,
	Mutation,
	Field,
	ObjectType,
	Query,
	FieldResolver,
	Root,
} from "type-graphql";
import { MyContext } from "../types";
import { User } from "../entities/User";
import argon2 from "argon2";
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from "../constants";
import { UsernamePasswordInput } from "./UsernamePasswordInput";
import { validateRegister } from "../utils/validateRegister";
import { v4 } from "uuid";

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

@Resolver(User)
export class UserResolver {
	@FieldResolver(() => String)
	email(@Root() user: User, @Ctx() { req }: MyContext) {
		if (req.session.userId === user.id) {
			return user.email;
		}
		return "";
	}

	@Query(() => User, { nullable: true })
	async me(@Ctx() { req }: MyContext): Promise<User | undefined | null> {
		if (!req.session.userId) {
			return null;
		}
		const id = req.session.userId;
		return await User.findOne(id);
	}

	@Mutation(() => UserResponse)
	async register(
		@Arg("data") { username, email, password }: UsernamePasswordInput,
		@Ctx() { req }: MyContext
	): Promise<UserResponse> {
		const alreadyExists = await User.findOne({ where: { username } });
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
		const user = await User.create({
			username,
			email,
			password: hashedPassword,
		}).save();

		req.session.userId = user.id;

		return { user };
	}

	@Mutation(() => UserResponse)
	async login(
		@Arg("usernameOrEmail") usernameOrEmail: string,
		@Arg("password") password: string,
		@Ctx() { req }: MyContext
	): Promise<UserResponse> {
		const user = await User.findOne(
			usernameOrEmail.includes("@")
				? { where: { email: usernameOrEmail } }
				: { where: { username: usernameOrEmail } }
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

	@Mutation(() => UserResponse)
	async changePassword(
		@Arg("token") token: string,
		@Arg("newPassword") newPassword: string,
		@Ctx() { redis, req }: MyContext
	): Promise<UserResponse> {
		const key = FORGET_PASSWORD_PREFIX + token;
		const userId = await redis.get(key);

		if (!userId) {
			return {
				errors: [
					{
						field: "token",
						message: "invalid token",
					},
				],
			};
		}

		const id = parseInt(userId);
		const user = await User.findOne(id);

		if (!user) {
			return {
				errors: [
					{
						field: "token",
						message: "user no longer exists",
					},
				],
			};
		}

		await User.update({ id }, { password: await argon2.hash(newPassword) });

		await redis.del(key);
		req.session.userId = user.id;

		return { user };
	}

	@Mutation(() => String)
	async forgotPassword(
		@Arg("email") email: string,
		@Ctx() { redis }: MyContext
	): Promise<string> {
		// the purpose of this method is send an email but
		// I made it simple by sending the url in the response of the mutation.
		const user = await User.findOne({ where: { email } });
		if (!user) {
			return "";
		}

		const token = v4();
		await redis.set(
			FORGET_PASSWORD_PREFIX + token,
			user.id,
			"ex",
			1000 * 60 * 60 * 24 * 3
		); // 3 days

		const url = `http://localhost:3000/change-password/${token}`;
		console.log("url", url);

		return url;
	}
}
