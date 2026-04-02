import {DataTypes, Model, Optional} from "sequelize";
import sequelize from "../config/database";
import User from "./User";

interface RemindMatchAttributes {
    id: number;
    game: "chess" | "pong";
    player1ID: number;
    player2ID: number;
    winnerID: number | null;
    scoreP1: number | null;
    scoreP2: number | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface MatchCreationAttributes extends Optional<RemindMatchAttributes, "id" | "winnerID" | "scoreP1" | "scoreP2"> {}

class RemindMatch extends Model<RemindMatchAttributes, MatchCreationAttributes> implements RemindMatchAttributes {
    public id!: number;
    public game!: "chess" | "pong";
    public player1ID!: number;
    public player2ID!: number;
    public winnerID!: number | null;
    public scoreP1!: number | null;
    public scoreP2!: number | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

RemindMatch.init({
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    game: {
        type: DataTypes.ENUM('chess', 'pong'),
        allowNull: false,
    },
    player1ID: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    player2ID: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    winnerID: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
    },
    scoreP1: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    scoreP2: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
}, 
{
    tableName: 'remind_matches',
    sequelize,
});


User.hasMany(RemindMatch, { foreignKey: 'player1ID', as: 'matches' });
User.hasMany(RemindMatch, { foreignKey: 'player2ID', as: 'matches' });

RemindMatch.belongsTo(User, { foreignKey: 'player1ID', as: 'player1' });
RemindMatch.belongsTo(User, { foreignKey: 'player2ID', as: 'player2' });

export default RemindMatch;