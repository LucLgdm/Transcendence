import { Router } from "express";
import { auth, AuthRequest } from "../middleware";
import User from "../models/User";
import Friendship from "../models/Friendship";

const FriendRoute = Router();

FriendRoute.post("/:id",  auth, async (req: AuthRequest, res) => {
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
                userId: currentUseId, friendId }
            });
        if (existing) {
            return res.status(400).json({error: "vous etes deja amis"});
        }

        const friendship = await Friendship.create({
            userId: currentUseId, friendId,
            status: "accepter",
        });

        res.status(201).json(friendship);
        
    } catch (error) {
        res.status(500).json({error: "erreur lors de l'ajout d'amis"});
    }
});

FriendRoute.post("/:id/accept", auth, async (req: AuthRequest, res) => {
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

FriendRoute.delete("/:id", auth, async (req: AuthRequest, res) => {
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


FriendRoute.get("/", auth, async (req: AuthRequest, res) => {
    try {
        const currentUserId = req.user!.id;
        const friendships = await Friendship.findAll({
            where: {
                userId: currentUserId,
                status: "accepter",
            },
            include: [
                {
                    model: User,
                    as: "friend",
                    attributes: ["id", "username", "email"],
                },
            ],
        });

        const friends = friendships
            .map((friendship) => friendship.get("friend") as User | null)
            .filter((friend): friend is User => Boolean(friend))
            .map((friend) => ({
                id: friend.id,
                username: friend.username,
                email: friend.email,
            }));
        res.json(friends);
    } catch (err) {
        res.status(500).json({error:"Erreur"});
    }
});

export default FriendRoute;