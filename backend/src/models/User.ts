import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

/**
 * Attributs du User tels qu'ils existent en base
 */
interface UserAttributes {
	id: number;
	username: string;
	email: string;
	password?: string;
	login_42?: string;
	profile_picture?: string;
	createdAt?: Date;
	updatedAt?: Date;
}

/**
 * Attributs requis à la création
 * (id, createdAt, updatedAt sont générés automatiquement)
 */
interface UserCreationAttributes
extends Optional<UserAttributes, "id"> {}

/**
 * Classe User
 */
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

	public readonly createdAt!: Date;
	public readonly updatedAt!: Date;
}
``
/**
 * Définition du modèle Sequelize
 */
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
	},
	{
		tableName: "users",
		sequelize,
	}
);

export default User;
