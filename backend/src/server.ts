import express from 'express';
import { connectDatabase } from './config/database';
import User from "./models/User";
import Friendship from "./models/Friendship";
import userRoutes from "./routes/index";
import FriendRoute from "./routes/friend";
import remindMatchRoute from "./routes/remindmatch";
import messageRoute from "./routes/Message";
import chessGameRoute from "./routes/chessgame";
import cors from 'cors';
const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware
app.use(express.json());
app.use(cors({
	origin: true,
}));
app.use("/users", userRoutes);
app.use("/friends", FriendRoute);
app.use("/messages", messageRoute);
app.use("/remind-matches", remindMatchRoute);
app.use("/chess-games", chessGameRoute);
async function bootstrap() {
	await connectDatabase();
	// Création des tables si elles n'existent pas
	await User.sync();
	await Friendship.sync();
	console.log("User & Friendship tables synced");
	app.listen(PORT, "0.0.0.0", () => {
		console.log(`Server is running on http://0.0.0.0:${PORT}`);
	});
}

bootstrap();