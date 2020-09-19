import { Column, Entity, BaseEntity, ManyToOne, PrimaryColumn } from "typeorm";
import { Post } from "./Post";
import { User } from "./User";

@Entity()
export class Updoot extends BaseEntity {
	@PrimaryColumn()
	userId: number;

	@ManyToOne(() => User, (user) => user.updoots)
	user: User;

	@PrimaryColumn()
	postId: number;

	@ManyToOne(() => Post, (post) => post.updoots)
	post: Post;

	@Column()
	value: number;
}
