"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const Tournament_1 = __importDefault(require("./Tournament"));
class TournamentMatch extends sequelize_1.Model {
}
TournamentMatch.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    tournamentId: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    round: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    indexInRound: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    player1Id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
    },
    player2Id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
    },
    winnerId: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
    },
}, {
    tableName: "tournament_matches",
    sequelize: database_1.default,
    indexes: [{ unique: true, fields: ["tournamentId", "round", "indexInRound"] }],
});
TournamentMatch.belongsTo(Tournament_1.default, { foreignKey: "tournamentId", as: "tournament" });
Tournament_1.default.hasMany(TournamentMatch, { foreignKey: "tournamentId", as: "matches" });
exports.default = TournamentMatch;
