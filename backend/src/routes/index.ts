import { Router } from "express";
import User from "../models/User";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { auth, AutRequest } from "../middleware";
import axios from 'axios';

const router = Router();

const getFrontendBaseUrl = (hostName: string): string => {
	const configured = process.env.FRONTEND_BASE_URL;
	if (configured) {
		return configured;
	}
	return `http://${hostName}:8080`;
};

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
		if (!user || !user.password)
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

router.get("/me", auth, async (req: AutRequest, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Non authentifié" });
        }

        const user = await User.findByPk(req.user.id, {
            attributes: ["id", "username", "email", "createdAt"],
        });

        if (!user) {
            return res.status(404).json({ error: "Utilisateur non trouvé" });
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

router.get("/auth/42", (req, res) => {
	const callbackUrl = process.env.OAUTH_42_CALLBACK_URL || "";
	const authUrl = `https://api.intra.42.fr/oauth/authorize?client_id=${process.env.OAUTH_42_UID}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=public`;
	res.redirect(authUrl);
});

router.get("/auth/42/callback", async (req, res) => {
	try {
		const { code } = req.query;
		const frontendBaseUrl = getFrontendBaseUrl(req.hostname);

		if (!code) {
			return res.redirect(`${frontendBaseUrl}/?error=no_code`);
		}

		// 1. Échange le code contre un token d'accès
		const tokenResponse = await axios.post(
			"https://api.intra.42.fr/oauth/token",
			{
				grant_type: "authorization_code",
				client_id: process.env.OAUTH_42_UID,
				client_secret: process.env.OAUTH_42_SECRET,
				code,
				redirect_uri: process.env.OAUTH_42_CALLBACK_URL,
			}
		);

		const accessToken = tokenResponse.data.access_token;

		// 2. Récupère les infos utilisateur depuis l'API 42
		const userResponse = await axios.get(
			"https://api.intra.42.fr/v2/me",
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			}
		);

		const userData = userResponse.data;
		const login42 = userData.login;
		const email = userData.email;
		const profilePicture = userData.image?.link;

		// 3. Cherche ou crée l'utilisateur
		let user = await User.findOne({ where: { login_42: login42 } });

		if (!user) {
			// Crée un nouvel utilisateur
			user = await User.create({
				username: login42,
				email,
				login_42: login42,
				profile_picture: profilePicture,
			});
		} else {
			// Met à jour les infos (en cas de changement)
			await user.update({
				email,
				profile_picture: profilePicture,
			});
		}

		// 4. Génère un JWT pour la session
		const jwtToken = jwt.sign(
			{ id: user.id, username: user.username },
			process.env.JWT_SECRET || "secret",
			{ expiresIn: "24h" }
		);

		// 5. Redirige vers le frontend avec le token
		res.redirect(`${frontendBaseUrl}/index.html?token=${jwtToken}`);
	} catch (err) {
		console.error("OAuth 42 error:", err);
		const frontendBaseUrl = getFrontendBaseUrl(req.hostname);
		res.redirect(`${frontendBaseUrl}/?error=auth_failed`);
	}
});

export default router;
