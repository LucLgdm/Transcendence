import express from 'express';
import { connectDatabase } from './config/database';
import sequelize from "./config/database";
import User from "./models/User";
import Friendship from "./models/Friendship";
import Message from "./models/Message";
import RemindMatch from "./models/remindmatch";
import userRoutes from "./routes/index";
import FriendRoute from "./routes/friend";
import remindMatchRoute from "./routes/remindmatch";
import messageRoute from "./routes/Message";
import chessGameRoute from "./routes/chessgame";
import tournamentRoute from "./routes/tournament";
import Tournament from "./models/Tournament";
import TournamentParticipant from "./models/TournamentParticipant";
import TournamentMatch from "./models/TournamentMatch";
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
app.use("/tournaments", tournamentRoute);
async function bootstrap() {
	await connectDatabase();
	await sequelize.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS elo INTEGER NOT NULL DEFAULT 500;");
	await User.sync();
	await Friendship.sync();
	await Message.sync();
	await RemindMatch.sync();
	await Tournament.sync();
	await sequelize.query(
		"ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS game VARCHAR(16) NOT NULL DEFAULT 'chess';"
	);
	await TournamentParticipant.sync();
	await TournamentMatch.sync();
	console.log("User, Friendship, Message, RemindMatch & Tournament tables synced");
	app.listen(PORT, "0.0.0.0", () => {
		console.log(`Server is running on http://0.0.0.0:${PORT}`);
	});
}
bootstrap();