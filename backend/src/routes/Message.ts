import { Router } from "express";
import { auth, AuthRequest } from "../middleware";
import Message from "../models/Message";
import { Op } from "sequelize";

const messageRoute = Router();

messageRoute.get("/:otheruserId", auth, async (req: AuthRequest, res) => {
    try {
        const currentUserId = req.user!.id;
        const otherUserId = Number(req.params.otherUserId);

        const messages = await Message.findAll({
            where: {
                [Op.or]: [
                    {senderId: currentUserId, receiverId: otherUserId},
                    {senderId: otherUserId, receiverId: currentUserId},
                ],
            },
            order: [['createdAt', 'ASC']],
        });

        res.json(messages);
    } catch (error) {
        res.status(500).json({error: "Erreur lors de la récupération des messages"});
    }
});

messageRoute.post("/", auth, async (req: AuthRequest, res) => {
    try {
        const currentUserId = req.user!.id;
        const otherUserId = Number(req.params.otheruserId);
        const {content} = req.body;

        if (!content || content.trim() === "")
            return res.status(400).json({error: "Le contenu du message est requis"});

        const message = await Message.create({
            senderId: currentUserId,
            receiverId: otherUserId,
            content: content.trim(),
        });

        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({error: "Erreur lors de l'envoi du message"});
    }
});

export default messageRoute;