import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";
import Tournament from "./Tournament";

interface TournamentMatchAttributes {
	id: number;
	tournamentId: number;
	round: number;
	indexInRound: number;
	player1Id: number | null;
	player2Id: number | null;
	winnerId: number | null;
	createdAt?: Date;
	updatedAt?: Date;
}

interface TournamentMatchCreationAttributes
	extends Optional<
		TournamentMatchAttributes,
		"id" | "player1Id" | "player2Id" | "winnerId" | "createdAt" | "updatedAt"
	> {}

class TournamentMatch
	extends Model<TournamentMatchAttributes, TournamentMatchCreationAttributes>
	implements TournamentMatchAttributes
{
	public id!: number;
	public tournamentId!: number;
	public round!: number;
	public indexInRound!: number;
	public player1Id!: number | null;
	public player2Id!: number | null;
	public winnerId!: number | null;
	public readonly createdAt!: Date;
	public readonly updatedAt!: Date;
}

TournamentMatch.init(
	{
		id: {
			type: DataTypes.INTEGER.UNSIGNED,
			autoIncrement: true,
			primaryKey: true,
		},
		tournamentId: {
			type: DataTypes.INTEGER.UNSIGNED,
			allowNull: false,
		},
		round: {
			type: DataTypes.INTEGER.UNSIGNED,
			allowNull: false,
		},
		indexInRound: {
			type: DataTypes.INTEGER.UNSIGNED,
			allowNull: false,
		},
		player1Id: {
			type: DataTypes.INTEGER.UNSIGNED,
			allowNull: true,
		},
		player2Id: {
			type: DataTypes.INTEGER.UNSIGNED,
			allowNull: true,
		},
		winnerId: {
			type: DataTypes.INTEGER.UNSIGNED,
			allowNull: true,
		},
	},
	{
		tableName: "tournament_matches",
		sequelize,
		indexes: [{ unique: true, fields: ["tournamentId", "round", "indexInRound"] }],
	}
);

TournamentMatch.belongsTo(Tournament, { foreignKey: "tournamentId", as: "tournament" });
Tournament.hasMany(TournamentMatch, { foreignKey: "tournamentId", as: "matches" });

export default TournamentMatch;
