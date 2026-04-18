"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class Tournament extends sequelize_1.Model {
}
Tournament.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING(160),
        allowNull: false,
    },
    game: {
        type: sequelize_1.DataTypes.STRING(16),
        allowNull: false,
        defaultValue: "chess",
    },
    capacity: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    status: {
        type: sequelize_1.DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "registration",
    },
    createdByUserId: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
}, {
    tableName: "tournaments",
    sequelize: database_1.default,
});
exports.default = Tournament;
