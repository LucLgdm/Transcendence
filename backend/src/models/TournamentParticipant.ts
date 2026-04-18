import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";
import User from "./User";
import Tournament from "./Tournament";

interface TournamentParticipantAttributes {
	id: number;
	tournamentId: number;
	userId: number;
	createdAt?: Date;
	updatedAt?: Date;
}

interface TournamentParticipantCreationAttributes
	extends Optional<TournamentParticipantAttributes, "id" | "createdAt" | "updatedAt"> {}

class TournamentParticipant
	extends Model<TournamentParticipantAttributes, TournamentParticipantCreationAttributes>
	implements TournamentParticipantAttributes
{
	public id!: number;
	public tournamentId!: number;
	public userId!: number;
	public readonly createdAt!: Date;
	public readonly updatedAt!: Date;
}

TournamentParticipant.init(
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
		userId: {
			type: DataTypes.INTEGER.UNSIGNED,
			allowNull: false,
		},
	},
	{
		tableName: "tournament_participants",
		sequelize,
		indexes: [{ unique: true, fields: ["tournamentId", "userId"] }],
	}
);

TournamentParticipant.belongsTo(User, { foreignKey: "userId", as: "user" });
TournamentParticipant.belongsTo(Tournament, { foreignKey: "tournamentId", as: "tournament" });
Tournament.hasMany(TournamentParticipant, { foreignKey: "tournamentId", as: "participants" });
User.hasMany(TournamentParticipant, { foreignKey: "userId", as: "tournamentEntries" });

export default TournamentParticipant;
