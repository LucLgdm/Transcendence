"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middleware_1 = require("../middleware");
const User_1 = __importDefault(require("../models/User"));
const Friendship_1 = __importDefault(require("../models/Friendship"));
const sequelize_1 = require("sequelize");
const FriendRoute = (0, express_1.Router)();
FriendRoute.post("/:id", middleware_1.auth, async (req, res) => {
    try {
        const currentUseId = req.user.id;
        const friendId = parseInt(req.params.id);
        if (currentUseId === friendId) {
            return res.status(400).json({ error: "pas possible de t'ajouter toi meme.." });
        }
        const friend = await User_1.default.findByPk(friendId);
        if (!friend) {
            return res.status(404).json({ error: "amis non trouver" });
        }
        const existing = await Friendship_1.default.findOne({
            where: {
                [sequelize_1.Op.or]: [
                    { userId: currentUseId, friendId },
                    { userId: friendId, friendId: currentUseId },
                ],
            },
        });
        if (existing) {
            if (existing.status === "accepter") {
                return res.status(400).json({ error: "vous etes deja amis" });
            }
            if (existing.userId === friendId && existing.friendId === currentUseId) {
                existing.status = "accepter";
                await existing.save();
                return res.status(200).json(existing);
            }
            return res.status(400).json({ error: "demande d'ami déjà envoyée" });
        }
        const friendship = await Friendship_1.default.create({
            userId: currentUseId, friendId,
            status: "attente",
        });
        res.status(201).json(friendship);
    }
    catch (error) {
        res.status(500).json({ error: "erreur lors de l'ajout d'amis" });
    }
});
FriendRoute.post("/:id/accept", middleware_1.auth, async (req, res) => {
    try {
        const currentUseId = req.user?.id;
        const otherId = Number(req.params.id);
        const friendship = await Friendship_1.default.findOne({
            where: {
                userId: otherId,
                friendId: currentUseId,
                status: "attente",
            }
        });
        if (!friendship) {
            return res.status(404).json({ error: "demande d'ami non trouver" });
        }
        friendship.status = "accepter";
        await friendship.save();
        res.json(friendship);
    }
    catch (error) {
        res.status(500).json({ error: "erreur lors de l'acceptation d'amis" });
    }
});
FriendRoute.delete("/:id", middleware_1.auth, async (req, res) => {
    try {
        const currentUseId = req.user?.id;
        const otherId = Number(req.params.id);
        await Friendship_1.default.destroy({
            where: {
                userId: currentUseId,
                friendId: otherId,
            },
        });
        await Friendship_1.default.destroy({
            where: {
                userId: otherId,
                friendId: currentUseId,
            },
        });
        res.status(204).send();
    }
    catch (err) {
        res.status(500).json({ error: "Erreur" });
    }
});
FriendRoute.get("/", middleware_1.auth, async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const friendships = await Friendship_1.default.findAll({
            where: {
                [sequelize_1.Op.or]: [
                    { userId: currentUserId },
                    { friendId: currentUserId },
                ],
                status: "accepter",
            },
        });
        const friendIds = [...new Set(friendships.map((friendship) => friendship.userId === currentUserId ? friendship.friendId : friendship.userId))];
        if (friendIds.length === 0) {
            return res.json([]);
        }
        const users = await User_1.default.findAll({
            where: { id: friendIds },
            attributes: ["id", "username", "email"],
        });
        const friends = users.map((friend) => ({
            id: friend.id,
            username: friend.username,
            email: friend.email,
        }));
        res.json(friends);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur" });
    }
});
FriendRoute.get("/requests", middleware_1.auth, async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const incomingRequests = await Friendship_1.default.findAll({
            where: {
                friendId: currentUserId,
                status: "attente",
            },
            include: [
                {
                    model: User_1.default,
                    as: "requester",
                    attributes: ["id", "username", "email"],
                },
            ],
        });
        const requests = incomingRequests
            .map((friendship) => friendship.get("requester"))
            .filter((user) => Boolean(user))
            .map((user) => ({
            id: user.id,
            username: user.username,
            email: user.email,
        }));
        res.json(requests);
    }
    catch (error) {
        res.status(500).json({ error: "erreur lors de la récupération des demandes d'amis" });
    }
});
exports.default = FriendRoute;
