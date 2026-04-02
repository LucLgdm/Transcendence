import { Router } from "express";
import { auth, AuthRequest } from "../middleware";
import RemindMatch from "../models/remindmatch";
import User from "../models/User";
import {Op, fn, col} from "sequelize";


const remindMatchRoute = Router();

remindMatchRoute.post("/", auth, async (req: AuthRequest, res) => {
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


  remindMatchRoute.get("/leaderboard", async (req, res) => {
    try {
      const { game } = req.query;
      if (!game || typeof game !== "string") {
        return res.status(400).json({ error: "Paramètre 'game' requis" });
      }
  
      const rows = await RemindMatch.findAll({
        where: { game, winnerID: { [Op.ne]: null } },
        attributes: ["winnerId", [fn("COUNT", col("winnerId")), "wins"]],
        group: ["winnerId"],
        order: [[fn("COUNT", col("winnerId")), "DESC"]],
        limit: 10,
        include: [
          {
            model: User,
            as: "player1",
            attributes: ["id", "username"],
          },
        ],
      });
  
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors du leaderboard" });
    }
  });
  
  export default remindMatchRoute;