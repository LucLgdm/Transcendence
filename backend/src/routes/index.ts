import { Router } from "express";
import User from "../models/User";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: "Invalid payload" });
  }
});

router.get("/", async (_req, res) => {
  const users = await User.findAll();
  res.json(users);
});

router.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const user = await User.create({ username, email, password });
        res.status(201).json({ message: "Utilisateur créé" });
    } catch (err) {
        res.status(400).json({ error: "Utilisateur déjà existant ou données invalides" });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ where: { username } });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});


export default router;
