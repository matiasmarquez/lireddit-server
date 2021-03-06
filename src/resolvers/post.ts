import { isAuth } from "../middleware/isAuth";
import { MyContext } from "src/types";
import {
	Resolver,
	Query,
	Arg,
	Mutation,
	InputType,
	Field,
	Ctx,
	UseMiddleware,
	Int,
	FieldResolver,
	Root,
	ObjectType,
} from "type-graphql";
import { Post } from "../entities/Post";
import { getConnection } from "typeorm";
import { Updoot } from "../entities/Updoot";
import { User } from "../entities/User";

@InputType()
class PostInput {
	@Field()
	title: string;

	@Field()
	text: string;
}

@ObjectType()
class PaginatedPosts {
	@Field(() => [Post])
	posts: Post[];

	@Field(() => Boolean)
	hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {
	@FieldResolver(() => String)
	shortText(@Root() root: Post) {
		let dots = "...";
		if (root.text.length <= 50) {
			dots = "";
		}
		return `${root.text.slice(0, 50)}${dots}`;
	}

	@FieldResolver(() => Int, { nullable: true })
	async voteStatus(
		@Root() post: Post,
		@Ctx() { req, updootLoader }: MyContext
	): Promise<number | null> {
		if (!req.session.userId) {
			return null;
		}
		const updoot = await updootLoader.load({postId: post.id, userId: req.session.userId})
		return updoot ? updoot.value : null;
	}

	@FieldResolver(() => User)
	author(@Root() post: Post, @Ctx() { userLoader }: MyContext) {
		return userLoader.load(post.authorId);
	}

	@Mutation(() => Boolean)
	@UseMiddleware(isAuth)
	async vote(
		@Arg("postId", () => Int) postId: number,
		@Arg("value", () => Int) value: number,
		@Ctx() { req }: MyContext
	): Promise<boolean> {
		const isUpdoot = value !== -1;
		const point = isUpdoot ? 1 : -1;
		const { userId } = req.session;

		const updoot = await Updoot.findOne({ where: { postId, userId } });

		if (updoot && updoot.value !== point) {
			await getConnection().transaction(async (em) => {
				await em
					.getRepository(Updoot)
					.update({ userId, postId }, { value: point });
				await em
					.getRepository(Post)
					.update(
						{ id: postId },
						{ points: () => `points + ${2 * point}` }
					);
			});
		} else if (!updoot) {
			await getConnection().transaction(async (em) => {
				await em
					.getRepository(Updoot)
					.insert({ postId, userId, value: point });
				await em
					.getRepository(Post)
					.update(
						{ id: postId },
						{ points: () => `points + ${point}` }
					);
			});
		}
		return true;
	}

	@Query(() => PaginatedPosts)
	async posts(
		@Arg("limit", () => Int) limit: number,
		@Arg("cursor", () => String, { nullable: true }) cursor: string | null
	): Promise<PaginatedPosts> {
		const realLimit = Math.min(50, limit);
		const realLimitPlusOne = realLimit + 1;
		const qb = getConnection()
			.getRepository(Post)
			.createQueryBuilder("p")
			.innerJoinAndSelect("p.author", "author")
			.orderBy("p.createdAt", "DESC")
			.take(realLimitPlusOne);
		if (cursor) {
			qb.where("p.createdAt < :cursor", {
				cursor: new Date(parseInt(cursor)),
			});
		}
		const posts = await qb.getMany();
		return {
			posts: posts.slice(0, realLimit),
			hasMore: posts.length === realLimitPlusOne,
		};
	}

	@Query(() => Post, { nullable: true })
	post(@Arg("id", () => Int) id: number): Promise<Post | undefined> {
		return Post.findOne(id);
	}

	@Mutation(() => Post)
	@UseMiddleware(isAuth)
	async createPost(
		@Arg("data") data: PostInput,
		@Ctx() { req }: MyContext
	): Promise<Post> {
		return Post.create({
			...data,
			authorId: req.session.userId,
		}).save();
	}

	@Mutation(() => Post, { nullable: true })
	@UseMiddleware(isAuth)
	async updatePost(
		@Arg("id", () => Int) id: number,
		@Arg("title", { nullable: true }) title: string,
		@Arg("text", { nullable: true }) text: string,
		@Ctx() { req }: MyContext
	): Promise<Post | null> {
		await getConnection()
			.createQueryBuilder()
			.update(Post)
			.set({
				...(title && { title }),
				...(text && { text }),
			})
			.where("id = :id", { id })
			.andWhere("authorId = :authorId", { authorId: req.session.userId })
			.execute();
		const post = await Post.findOne({ id, authorId: req.session.userId });
		return post ? post : null;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(isAuth)
	async deletePost(
		@Arg("id", () => Int) id: number,
		@Ctx() { req }: MyContext
	): Promise<Boolean> {
		await Post.delete({ id, authorId: req.session.userId });
		return true;
	}
}
