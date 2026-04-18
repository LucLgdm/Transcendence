"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = exports.errorHandler = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler = (err, _req, res, _next) => {
    console.error(err instanceof Error ? err.stack : err);
    res.status(500).send("Something broke!");
};
exports.errorHandler = errorHandler;
const auth = (req, res, next) => {
    const autHead = req.headers.authorization;
    if (!autHead || !autHead.startsWith("Bearer ")) {
        return res.status(401).json({ error: "not approuved" });
    }
    const token = autHead.substring("Bearer".length).trim();
    try {
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "secret");
        req.user = { id: payload.id, username: payload.username };
        next();
    }
    catch (error) {
        return res.status(401).json({ error: "Invalid token" });
    }
};
exports.auth = auth;
