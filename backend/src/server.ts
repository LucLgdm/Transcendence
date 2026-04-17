import express from 'express';
import { connectDatabase } from './config/database';
import User from "./models/User";
import userRoutes from "./routes/index";
import cors from 'cors';
import twoFactorRoutes from "./routes/twoFactor";
const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(express.json());
app.use(cors({
	origin: "http://localhost:8080"
	}));
app.use("/users", userRoutes);
app.use("/2fa", twoFactorRoutes);
async function bootstrap() {
	await connectDatabase();
	// Création des tables si elles n'existent pas
	await User.sync({ alter: true });
	console.log("User table synced");
	app.listen(PORT, () => {
		console.log(`Server is running on http://localhost:${PORT}`);
	});
}

bootstrap();