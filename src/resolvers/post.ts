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
		@Root() root: Post,
		@Ctx() { req }: MyContext
	): Promise<number | null> {
		if (!req.session.userId) {
			return null;
		}
		const updoot = await getConnection()
			.getRepository(Updoot)
			.findOne({
				where: {
					userId: req.session.userId,
					postId: root.id,
				},
			});
		return updoot ? updoot.value : null;
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
		return Post.findOne(id, { relations: ["author"] });
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
	async updatePost(
		@Arg("id") id: number,
		@Arg("title", { nullable: true }) title: string
	): Promise<Post | null> {
		const post = await Post.findOne(id);
		if (!post) {
			return null;
		}
		if (typeof title !== "undefined") {
			await Post.update({ id }, { title });
		}
		return post;
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
