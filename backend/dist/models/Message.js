"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const User_1 = __importDefault(require("./User"));
class Message extends sequelize_1.Model {
}
Message.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    senderId: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    receiverId: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    content: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
}, {
    tableName: "messages",
    sequelize: database_1.default,
});
User_1.default.hasMany(Message, { foreignKey: "senderId", as: "sentMessages" });
User_1.default.hasMany(Message, { foreignKey: "receiverId", as: "receivedMessages" });
Message.belongsTo(User_1.default, { foreignKey: "senderId", as: "sender" });
Message.belongsTo(User_1.default, { foreignKey: "receiverId", as: "receiver" });
exports.default = Message;
