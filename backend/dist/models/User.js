"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class User extends sequelize_1.Model {
}
User.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    username: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    password: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    login_42: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        unique: true,
    },
    profile_picture: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    elo: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 500,
    },
}, {
    tableName: "users",
    sequelize: database_1.default,
});
exports.default = User;
