import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface UserAttributes {
	id: number;
	username: string;
	email: string;
	password?: string;
	login_42?: string;
	profile_picture?: string;
	elo: number;
	createdAt?: Date;
	updatedAt?: Date;
}

interface UserCreationAttributes
extends Optional<UserAttributes, "id" | "elo"> {}

class User
extends Model<UserAttributes, UserCreationAttributes>
implements UserAttributes
{
	public id!: number;
	public username!: string;
	public email!: string;
	public password?: string;
	public login_42?: string;
	public profile_picture?: string;
	public elo!: number;

	public readonly createdAt!: Date;
	public readonly updatedAt!: Date;
}

User.init(
	{
		id: {
			type: DataTypes.INTEGER.UNSIGNED,
			autoIncrement: true,
			primaryKey: true,
		},

		username: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
		},
		email: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
			validate: {
				isEmail: true,
			},
		},

		password: {
			type: DataTypes.STRING,
			allowNull: true,
		},

		login_42: {
			type: DataTypes.STRING,
			allowNull: true,
			unique: true,
		},

		profile_picture: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		elo: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 500,
		},
	},
	{
		tableName: "users",
		sequelize,
	}
);

export default User;
