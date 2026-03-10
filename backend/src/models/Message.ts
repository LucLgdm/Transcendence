import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";
import User from "./User";


interface MessageAttrib {
    id: number;
    senderId: number;
    receiverId: number;
    content: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface MessageCreationAttrib extends Optional<MessageAttrib, "id"> {}

class Message extends Model<MessageAttrib, MessageCreationAttrib> implements MessageAttrib {
    public id!: number;
    public senderId!: number;
    public receiverId!: number;
    public content!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Message.init({
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    senderId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    receiverId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    },
    {
      tableName: "messages",
      sequelize,
    }
);

User.hasMany(Message, { foreignKey: "senderId", as: "sentMessages" });
User.hasMany(Message, { foreignKey: "receiverId", as: "receivedMessages" });
Message.belongsTo(User, { foreignKey: "senderId", as: "sender" });
Message.belongsTo(User, { foreignKey: "receiverId", as: "receiver" });

export default Message;