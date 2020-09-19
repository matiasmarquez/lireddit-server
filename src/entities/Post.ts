import { Field, Int, ObjectType } from "type-graphql";
import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
	BaseEntity,
	ManyToOne,
	OneToMany,
} from "typeorm";
import { Updoot } from "./Updoot";
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

	@Field()
	@ManyToOne(() => User, (user) => user.posts)
	author: User;

	@OneToMany(() => Updoot, (updoot) => updoot.post)
	updoots: Updoot[];

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
