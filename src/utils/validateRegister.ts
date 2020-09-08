import { UsernamePasswordInput } from "src/resolvers/UsernamePasswordInput";
import { User } from "src/entities/User";

type RegisterInput = UsernamePasswordInput & { user: User | null };

export const validateRegister = ({ username, email, user }: RegisterInput) => {
	if (user) {
		return [
			{
				field: "username",
				message: "username already taken",
			},
		];
	}
	if (username.includes("@")) {
		return [
			{
				field: "username",
				message: "invalid username",
			},
		];
	}
	if (!email.includes("@")) {
		return [
			{
				field: "email",
				message: "invalid email",
			},
		];
	}
	return null;
};
