import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

export type TournamentStatus = "registration" | "in_progress" | "completed";
export type TournamentGame = "chess" | "pong";

interface TournamentAttributes {
	id: number;
	name: string;
	game: TournamentGame;
	capacity: number;
	status: TournamentStatus;
	createdByUserId: number;
	createdAt?: Date;
	updatedAt?: Date;
}

interface TournamentCreationAttributes
	extends Optional<TournamentAttributes, "id" | "game" | "status" | "createdAt" | "updatedAt"> {}

class Tournament
	extends Model<TournamentAttributes, TournamentCreationAttributes>
	implements TournamentAttributes
{
	public id!: number;
	public name!: string;
	public game!: TournamentGame;
	public capacity!: number;
	public status!: TournamentStatus;
	public createdByUserId!: number;
	public readonly createdAt!: Date;
	public readonly updatedAt!: Date;
}

Tournament.init(
	{
		id: {
			type: DataTypes.INTEGER.UNSIGNED,
			autoIncrement: true,
			primaryKey: true,
		},
		name: {
			type: DataTypes.STRING(160),
			allowNull: false,
		},
		game: {
			type: DataTypes.STRING(16),
			allowNull: false,
			defaultValue: "chess",
		},
		capacity: {
			type: DataTypes.INTEGER.UNSIGNED,
			allowNull: false,
		},
		status: {
			type: DataTypes.STRING(32),
			allowNull: false,
			defaultValue: "registration",
		},
		createdByUserId: {
			type: DataTypes.INTEGER.UNSIGNED,
			allowNull: false,
		},
	},
	{
		tableName: "tournaments",
		sequelize,
	}
);

export default Tournament;
