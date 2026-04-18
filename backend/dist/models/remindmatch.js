"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const User_1 = __importDefault(require("./User"));
class RemindMatch extends sequelize_1.Model {
}
RemindMatch.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    game: {
        type: sequelize_1.DataTypes.ENUM('chess', 'pong'),
        allowNull: false,
    },
    player1ID: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    player2ID: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    winnerID: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
    },
    scoreP1: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    scoreP2: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
}, {
    tableName: 'remind_matches',
    sequelize: database_1.default,
});
User_1.default.hasMany(RemindMatch, { foreignKey: 'player1ID', as: 'matchesAsPlayer1' });
User_1.default.hasMany(RemindMatch, { foreignKey: 'player2ID', as: 'matchesAsPlayer2' });
RemindMatch.belongsTo(User_1.default, { foreignKey: 'player1ID', as: 'player1' });
RemindMatch.belongsTo(User_1.default, { foreignKey: 'player2ID', as: 'player2' });
exports.default = RemindMatch;
