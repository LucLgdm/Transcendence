import { Router } from "express";
import { auth, AutRequest } from "../middleware";
import User from "../models/User";
import Friendship from "../models/Friendship";
import { Op } from "sequelize";

const FriendRoute = Router();

FriendRoute.post("/:id",  auth, async (req: AutRequest, res) => {
    try {
        const currentUseId = req.user!.id;
        const friendId = parseInt(req.params.id);

        if (currentUseId === friendId) {
            return res.status(400).json({error: "pas possible de t'ajouter toi meme.."});
        }

        const friend = await User.findByPk(friendId);
        if (!friend) {
            return res.status(404).json({error: "amis non trouver"});
        }

        const existing = await Friendship.findOne({
            where: {
                [Op.or]: [
                    { userId: currentUseId, friendId },
                    { userId: friendId, friendId: currentUseId },
                ],
            },
        });
        if (existing) {
            if (existing.status === "accepter") {
                return res.status(400).json({error: "vous etes deja amis"});
            }

            if (existing.userId === friendId && existing.friendId === currentUseId) {
                existing.status = "accepter";
                await existing.save();
                return res.status(200).json(existing);
            }

            return res.status(400).json({ error: "demande d'ami déjà envoyée" });
        }

        const friendship = await Friendship.create({
            userId: currentUseId, friendId,
            status: "attente",
        });

        res.status(201).json(friendship);
        
    } catch (error) {
        res.status(500).json({error: "erreur lors de l'ajout d'amis"});
    }
});

FriendRoute.post("/:id/accept", auth, async (req: AutRequest, res) => {
    try {
        const currentUseId = req.user?.id;
        const otherId = Number(req.params.id);

        const friendship = await Friendship.findOne({
            where : {
                userId: otherId,
                friendId: currentUseId,
                status: "attente",
            }
        })
        if (!friendship) {
            return res.status(404).json({error: "demande d'ami non trouver"});
        }

        friendship.status = "accepter";
        await friendship.save();
        res.json(friendship);
    } catch (error) {
        res.status(500).json({error: "erreur lors de l'acceptation d'amis"});
    }
});

FriendRoute.delete("/:id", auth, async (req: AutRequest, res) => {
    try {
        const currentUseId = req.user?.id;
        const otherId = Number(req.params.id);

        await Friendship.destroy( {
            where: {
                userId: currentUseId,
                friendId: otherId,
            },
    });

    await Friendship.destroy({
        where: {
          userId: otherId,
          friendId: currentUseId,
        },
      });

      res.status(204).send();
    } catch (err) {
        res.status(500).json({error:"Erreur"});
    }
});


FriendRoute.get("/", auth, async (req: AutRequest, res) => {
    try {
        const currentUserId = req.user!.id;
        const friendships = await Friendship.findAll({
            where: {
                [Op.or]: [
                    { userId: currentUserId },
                    { friendId: currentUserId },
                ],
                status: "accepter",
            },
        });

        const friendIds = [...new Set(friendships.map((friendship) =>
            friendship.userId === currentUserId ? friendship.friendId : friendship.userId
        ))];

        if (friendIds.length === 0) {
            return res.json([]);
        }

        const users = await User.findAll({
            where: { id: friendIds },
            attributes: ["id", "username", "email"],
        });

        const friends = users.map((friend) => ({
            id: friend.id,
            username: friend.username,
            email: friend.email,
        }));
        res.json(friends);
    } catch (err) {
        res.status(500).json({error:"Erreur"});
    }
});

FriendRoute.get("/requests", auth, async (req: AutRequest, res) => {
    try {
        const currentUserId = req.user!.id;
        const incomingRequests = await Friendship.findAll({
            where: {
                friendId: currentUserId,
                status: "attente",
            },
            include: [
                {
                    model: User,
                    as: "requester",
                    attributes: ["id", "username", "email"],
                },
            ],
        });

        const requests = incomingRequests
            .map((friendship) => friendship.get("requester") as User | null)
            .filter((user): user is User => Boolean(user))
            .map((user) => ({
                id: user.id,
                username: user.username,
                email: user.email,
            }));

        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: "erreur lors de la récupération des demandes d'amis" });
    }
});

export default FriendRoute;