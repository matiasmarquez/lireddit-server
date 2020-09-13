import { Field, Int, ObjectType } from "type-graphql";
import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
	BaseEntity,
	ManyToOne,
} from "typeorm";
import { User } from "./User";

@ObjectType()
@Entity()
export class Post extends BaseEntity {
	@Field(() => Int)
	@PrimaryGeneratedColumn()
	id!: number;

	@Field()
	@Column()
	authorId: number;

	@ManyToOne(() => User, (user) => user.posts)
	author: User;

	@Field()
	@Column()
	title!: string;

	@Field()
	@Column({ type: "tinytext" })
	text: string;

	@Field()
	@Column({ type: "int", default: 0 })
	points: number;

	@Field(() => String)
	@CreateDateColumn()
	createdAt: Date;

	@Field(() => String)
	@UpdateDateColumn()
	updatedAt: Date;
}
