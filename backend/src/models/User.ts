import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

/**
 * Attributs du User tels qu'ils existent en base
 */
interface UserAttributes {
	id: number;
	username: string;
	email: string;
	password: string;
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
	public password!: string;

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
			allowNull: false,
		},
	},
	{
		tableName: "users",
		sequelize,
	}
);

export default User;
