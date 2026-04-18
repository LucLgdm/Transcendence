"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = void 0;
// src/config/database.ts
const sequelize_1 = require("sequelize");
const useSsl = process.env.DB_SSL === 'true' ||
    process.env.DB_SSL === '1' ||
    process.env.DATABASE_SSL === 'true';
const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' &&
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false';
const sequelize = new sequelize_1.Sequelize(process.env.DB_NAME || 'transcendence', process.env.DB_USER || 'postgres', process.env.DB_PASSWORD || 'postgres', {
    host: process.env.DB_HOST || 'db',
    dialect: 'postgres',
    logging: false,
    ...(useSsl
        ? {
            dialectOptions: {
                ssl: {
                    require: true,
                    rejectUnauthorized,
                },
            },
        }
        : {}),
});
const connectDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected successfully');
    }
    catch (error) {
        console.error('❌ Unable to connect to database:', error);
        process.exit(1);
    }
};
exports.connectDatabase = connectDatabase;
exports.default = sequelize;
