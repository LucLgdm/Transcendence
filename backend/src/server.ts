import express from 'express';
import { connectDatabase } from './config/database';
import User from "./models/User";
import Friendship from "./models/Friendship";
import userRoutes from "./routes/index";
import FriendRoute from "./routes/friend";
import messageRoute from "./routes/Message";
import cors from 'cors';
const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(express.json());
app.use(cors({
	origin: "http://localhost:8080"
	}));
app.use("/users", userRoutes);
app.use("/friends", FriendRoute);
app.use("/messages", messageRoute);
async function bootstrap() {
	await connectDatabase();
	// Création des tables si elles n'existent pas
	await User.sync();
	await Friendship.sync();
	console.log("User & Friendship tables synced");
	app.listen(PORT, () => {
		console.log(`Server is running on http://localhost:${PORT}`);
	});
}

bootstrap();