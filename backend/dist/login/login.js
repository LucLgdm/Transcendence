"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const User_1 = __importDefault(require("../models/User"));
const routes_1 = __importDefault(require("../routes"));
routes_1.default.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await User_1.default.findOne({ where: { username } });
    const stored = user?.password;
    if (!user || !stored || typeof password !== "string" || !(await bcrypt_1.default.compare(password, stored)))
        return res.status(401).json({ error: "Identifiants incorrects" });
    res.json({ message: "Connecté", userId: user.id });
});
