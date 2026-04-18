interface User {
	username: string;
	password: string;
}

const userMap: Map<number, User> = new Map();
export { User, userMap };

