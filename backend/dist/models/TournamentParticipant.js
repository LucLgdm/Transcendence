"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const User_1 = __importDefault(require("./User"));
const Tournament_1 = __importDefault(require("./Tournament"));
class TournamentParticipant extends sequelize_1.Model {
}
TournamentParticipant.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    tournamentId: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    userId: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
}, {
    tableName: "tournament_participants",
    sequelize: database_1.default,
    indexes: [{ unique: true, fields: ["tournamentId", "userId"] }],
});
TournamentParticipant.belongsTo(User_1.default, { foreignKey: "userId", as: "user" });
TournamentParticipant.belongsTo(Tournament_1.default, { foreignKey: "tournamentId", as: "tournament" });
Tournament_1.default.hasMany(TournamentParticipant, { foreignKey: "tournamentId", as: "participants" });
User_1.default.hasMany(TournamentParticipant, { foreignKey: "userId", as: "tournamentEntries" });
exports.default = TournamentParticipant;
