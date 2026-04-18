"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middleware_1 = require("../middleware");
const remindmatch_1 = __importDefault(require("../models/remindmatch"));
const User_1 = __importDefault(require("../models/User"));
const sequelize_1 = require("sequelize");
const remindMatchRoute = (0, express_1.Router)();
remindMatchRoute.post("/", middleware_1.auth, async (req, res) => {
    try {
        const { game, player1ID, player2ID, winnerID, scoreP1, scoreP2 } = req.body;
        if (!game || !player1ID || !player2ID) {
            return res.status(400).json({ error: "pas de game, player1ID ou player2ID" });
        }
        const match = await remindmatch_1.default.create({
            game,
            player1ID,
            player2ID,
            winnerID,
            scoreP1,
            scoreP2,
        });
        res.status(201).json(match);
    }
    catch (error) {
        res.status(500).json({ error: "Erreur lors de la creation du match" });
    }
});
remindMatchRoute.get("/users/:id/matches", middleware_1.auth, async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const matches = await remindmatch_1.default.findAll({
            where: {
                [sequelize_1.Op.or]: [{ player1ID: userId }, { player2ID: userId }],
            },
            order: [["createdAt", "DESC"]],
            limit: 20,
        });
        res.json(matches);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur lors de la récupération des matchs" });
    }
});
remindMatchRoute.get("/leaderboard", async (req, res) => {
    try {
        const { game } = req.query;
        if (!game || typeof game !== "string") {
            return res.status(400).json({ error: "Paramètre 'game' requis" });
        }
        const rows = await remindmatch_1.default.findAll({
            where: { game, winnerID: { [sequelize_1.Op.ne]: null } },
            attributes: ["winnerId", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("winnerId")), "wins"]],
            group: ["winnerId"],
            order: [[(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("winnerId")), "DESC"]],
            limit: 10,
            include: [
                {
                    model: User_1.default,
                    as: "player1",
                    attributes: ["id", "username"],
                },
            ],
        });
        res.json(rows);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur lors du leaderboard" });
    }
});
exports.default = remindMatchRoute;
