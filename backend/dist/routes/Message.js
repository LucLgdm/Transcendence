"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middleware_1 = require("../middleware");
const Message_1 = __importDefault(require("../models/Message"));
const sequelize_1 = require("sequelize");
const messageRoute = (0, express_1.Router)();
messageRoute.get("/:otherUserId", middleware_1.auth, async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const otherUserId = Number(req.params.otherUserId);
        if (!Number.isFinite(otherUserId) || otherUserId <= 0) {
            return res.status(400).json({ error: "ID utilisateur invalide" });
        }
        const messages = await Message_1.default.findAll({
            where: {
                [sequelize_1.Op.or]: [
                    { senderId: currentUserId, receiverId: otherUserId },
                    { senderId: otherUserId, receiverId: currentUserId },
                ],
            },
            order: [['createdAt', 'ASC']],
        });
        res.json(messages);
    }
    catch (error) {
        res.status(500).json({ error: "Erreur lors de la récupération des messages" });
    }
});
messageRoute.post("/:otherUserId", middleware_1.auth, async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const otherUserId = Number(req.params.otherUserId);
        const { content } = req.body;
        if (!Number.isFinite(otherUserId) || otherUserId <= 0) {
            return res.status(400).json({ error: "ID utilisateur invalide" });
        }
        if (!content || content.trim() === "")
            return res.status(400).json({ error: "Le contenu du message est requis" });
        const message = await Message_1.default.create({
            senderId: currentUserId,
            receiverId: otherUserId,
            content: content.trim(),
        });
        res.status(201).json(message);
    }
    catch (error) {
        res.status(500).json({ error: "Erreur lors de l'envoi du message" });
    }
});
exports.default = messageRoute;
