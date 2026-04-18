"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const User_1 = __importDefault(require("./User"));
class Friendship extends sequelize_1.Model {
}
Friendship.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
            model: User_1.default,
            key: 'id',
        },
    },
    friendId: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
            model: User_1.default,
            key: 'id',
        },
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('attente', 'accepter', 'refuser'),
        allowNull: false,
        defaultValue: 'attente',
    },
}, {
    tableName: 'friendships',
    sequelize: database_1.default,
    indexes: [
        {
            unique: true,
            fields: ['userId', 'friendId'],
        },
    ],
});
User_1.default.hasMany(Friendship, { foreignKey: 'userId', as: 'friends' });
Friendship.belongsTo(User_1.default, { foreignKey: 'friendId', as: 'friend' });
Friendship.belongsTo(User_1.default, { foreignKey: 'userId', as: 'requester' });
exports.default = Friendship;
