import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

interface FriendshipAtrrib {
    id: number;
    userId: number;
    friendId: number;
    status: "attente" | "accepter" | "refuser";
    createdAt?: Date;
    updatedAt?: Date;
}

interface FriendshipCreationAttributes extends Optional<FriendshipAtrrib, "id" | "status"> {}

class Friendship extends Model<FriendshipAtrrib, FriendshipCreationAttributes> implements FriendshipAtrrib {
    public id!: number;
    public userId!: number;
    public friendId!: number;
    public status!: "attente" | "accepter" | "refuser";
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Friendship.init( {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        },
    },
    friendId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        },
    },
    status: {
        type: DataTypes.ENUM('attente', 'accepter', 'refuser'),
        allowNull: false,
        defaultValue: 'attente',
    },
},
{
    tableName: 'friendships',
    sequelize,
    indexes: [
        {
            unique: true,
            fields: ['userId', 'friendId'],
        },
    ],
});

User.hasMany(Friendship, { foreignKey: 'userId', as: 'friends' });
Friendship.belongsTo(User, { foreignKey: 'friendId', as: 'friend' });
Friendship.belongsTo(User, { foreignKey: 'userId', as: 'requester' });
export default Friendship;
