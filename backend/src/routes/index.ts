import { Router } from "express";
import User from "../models/User";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

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
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ username, email, password: hashedPassword });
        res.status(201).json({ message: "Utilisateur créé" });
    } catch (err) {
        res.status(400).json({ error: "Utilisateur déjà existant ou données invalides" });
    }
});
router.post("/login", async (req, res) => {
	try {
		const { username, password } = req.body;
		
		const user = await User.findOne({ where: { username } });
		if (!user)
			return res.status(401).json({ error: "Identifiants incorrects" });
		
		const validPassword = await bcrypt.compare(password, user.password);
		if (!validPassword)
			return res.status(401).json({ error: "Identifiants incorrects" });
		
		const token = jwt.sign(
			{ id: user.id, username: user.username },
			process.env.JWT_SECRET || "secret",
			{ expiresIn: "24h" }
		);
		
		res.json({ token });
	} catch (err) {
		res.status(500).json({ error: "Erreur serveur" });
	}
});

export default router;
