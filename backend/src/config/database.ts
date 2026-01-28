import { Sequelize } from "sequelize";

const sequelize = new Sequelize(
  process.env.DB_NAME as string,
  process.env.DB_USER as string,
  process.env.DB_PASSWORD as string,
  {
    host: process.env.DB_HOST || "db",
    dialect: "postgres",
    logging: false,
  }
);

export async function connectDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");
  } catch (error) {
    console.error("❌ Database connection failed", error);
    process.exit(1);
  }
}

export default sequelize;
