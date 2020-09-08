import { Entity, PrimaryKey, Property } from "mikro-orm";
import { ObjectType, Field, Int } from "type-graphql";

@ObjectType()
@Entity()
export class User {
	@Field(() => Int)
	@PrimaryKey()
	id!: number;

	@Field(() => String)
	@Property()
	createdAt = new Date();

	@Field(() => String)
	@Property({ onUpdate: () => new Date() })
	updatedAt = new Date();

	@Field()
	@Property({ unique: true })
	username!: string;

	@Field()
	@Property({ unique: true })
	email!: string;

	@Property()
	password!: string;
}
