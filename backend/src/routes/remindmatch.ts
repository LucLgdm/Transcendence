import { Router } from "express";
import { auth, AutRequest } from "../middleware";
import RemindMatch from "../models/remindmatch";
import { Op } from "sequelize";


const remindMatchRoute = Router();

remindMatchRoute.post("/", auth, async (req: AutRequest, res) => {
    try {
        const { game, player1ID, player2ID, winnerID, scoreP1, scoreP2 } = req.body;

        if (!game || !player1ID || !player2ID) {
            return res.status(400).json({error: "pas de game, player1ID ou player2ID"});
        }

        const match = await RemindMatch.create({
            game,
            player1ID,
            player2ID,
            winnerID,
            scoreP1,
            scoreP2,
        });

        res.status(201).json(match);
    } catch (error) {
        res.status(500).json({error: "Erreur lors de la creation du match"});
    }
});

remindMatchRoute.get("/users/:id/matches", auth, async (req, res) => {
    try {
      const userId = Number(req.params.id);
  
      const matches = await RemindMatch.findAll({
        where: {
          [Op.or]: [{ player1ID: userId }, { player2ID: userId }],
        },
        order: [["createdAt", "DESC"]],
        limit: 20,
      });
  
      res.json(matches);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération des matchs" });
    }
});

export default remindMatchRoute;