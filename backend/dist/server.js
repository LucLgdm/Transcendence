"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("./config/database");
const User_1 = __importDefault(require("./models/User"));
const Friendship_1 = __importDefault(require("./models/Friendship"));
const Message_1 = __importDefault(require("./models/Message"));
const remindmatch_1 = __importDefault(require("./models/remindmatch"));
const index_1 = __importDefault(require("./routes/index"));
const friend_1 = __importDefault(require("./routes/friend"));
const remindmatch_2 = __importDefault(require("./routes/remindmatch"));
const Message_2 = __importDefault(require("./routes/Message"));
const chessgame_1 = __importDefault(require("./routes/chessgame"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 3000;
// Middleware
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: true,
}));
app.use("/users", index_1.default);
app.use("/friends", friend_1.default);
app.use("/messages", Message_2.default);
app.use("/remind-matches", remindmatch_2.default);
app.use("/chess-games", chessgame_1.default);
async function bootstrap() {
    await (0, database_1.connectDatabase)();
    await User_1.default.sync();
    await Friendship_1.default.sync();
    await Message_1.default.sync();
    await remindmatch_1.default.sync();
    console.log("User, Friendship, Message & RemindMatch tables synced");
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server is running on http://0.0.0.0:${PORT}`);
    });
}
bootstrap();
