import { Field, Int, ObjectType } from "type-graphql";
import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
	BaseEntity,
	OneToMany,
} from "typeorm";
import { Post } from "./Post";
import { Updoot } from "./Updoot";

@ObjectType()
@Entity()
export class User extends BaseEntity {
	@Field(() => Int)
	@PrimaryGeneratedColumn()
	id!: number;

	@OneToMany(() => Post, (post) => post.author)
	posts: Post[];

	@OneToMany(() => Updoot, (updoot) => updoot.user)
	updoots: Updoot[];

	@Field()
	@Column({ unique: true })
	username!: string;

	@Field()
	@Column({ unique: true })
	email!: string;

	@Column()
	password!: string;

	@Field(() => String)
	@CreateDateColumn()
	createdAt: Date;

	@Field(() => String)
	@UpdateDateColumn()
	updatedAt: Date;
}
