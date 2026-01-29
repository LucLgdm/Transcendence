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

export default router;
