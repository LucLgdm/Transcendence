import express from 'express';
import { connectDatabase } from './config/database';
import User from "./models/User";
import userRoutes from "./routes/index";
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use("/users", userRoutes);
async function bootstrap() {
	await connectDatabase();
	// Création des tables si elles n'existent pas
	await User.sync();
	console.log("✅ User table synced");
	app.listen(PORT, () => {
		console.log(`Server is running on https://app:${PORT}`);
	});
}

bootstrap();