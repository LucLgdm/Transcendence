import { Router } from "express";
import User from "../models/User";
import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from "jsonwebtoken";
import { col, fn, Op } from "sequelize";
import Message from "../models/Message";
import Friendship from "../models/Friendship";
import RemindMatch from "../models/remindmatch";
import { auth, AutRequest } from "../middleware";
import axios from 'axios';
import sequelize from "../config/database";
import { parseLoginBody, parseRegisterBody, isValidLookupUsername } from "../validation/userAuthInput";

const router = Router();

const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "30d") as SignOptions["expiresIn"];
async function findUserProfileBySlug(username: string) {
	return User.findOne({
		where: sequelize.where(fn("LOWER", col("username")), username.toLowerCase()),
		attributes: ["id", "username", "email", "createdAt", "elo", "profile_picture"],
	});
}

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
        const parsed = parseRegisterBody(req.body);
        if (!parsed.ok) {
            return res.status(400).json({ error: parsed.error });
        }
        const { username, email, password } = parsed;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ username, email, password: hashedPassword });
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET || "secret",
            { expiresIn: JWT_EXPIRES_IN }
        );
        res.status(201).json({ token });
    } catch (err) {
        res.status(400).json({ error: "Utilisateur déjà existant ou données invalides" });
    }
});
router.post("/login", async (req, res) => {
	try {
		const parsed = parseLoginBody(req.body);
		if (!parsed.ok) {
			return res.status(400).json({ error: parsed.error });
		}
		const { username, password } = parsed;

		const user = await User.findOne({ where: { username } });
		if (!user || !user.password)
			return res.status(401).json({ error: "Identifiants incorrects" });

		const validPassword = await bcrypt.compare(password, user.password);
		if (!validPassword)
			return res.status(401).json({ error: "Identifiants incorrects" });

		const token = jwt.sign(
			{ id: user.id, username: user.username },
			process.env.JWT_SECRET || "secret",
			{ expiresIn: JWT_EXPIRES_IN }
		);

		res.json({ token });
	} catch (err) {
		res.status(500).json({ error: "Erreur serveur" });
	}
});

router.delete("/me", auth, async (req: AutRequest, res) => {
	if (!req.user) {
		return res.status(401).json({ error: "Non authentifié" });
	}
	const userId = req.user.id;
	try {
		await sequelize.transaction(async (transaction) => {
			await Message.destroy({
				where: {
					[Op.or]: [{ senderId: userId }, { receiverId: userId }],
				},
				transaction,
			});
			await Friendship.destroy({
				where: {
					[Op.or]: [{ userId: userId }, { friendId: userId }],
				},
				transaction,
			});
			await RemindMatch.destroy({
				where: {
					[Op.or]: [
						{ player1ID: userId },
						{ player2ID: userId },
						{ winnerID: userId },
					],
				},
				transaction,
			});
			await User.destroy({ where: { id: userId }, transaction });
		});
		res.status(204).send();
	} catch (err) {
		console.error("DELETE /users/me:", err);
		res.status(500).json({ error: "delete-account-failed" });
	}
});

router.get("/me", auth, async (req: AutRequest, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Non authentifié" });
        }

        const user = await User.findByPk(req.user.id, {
            attributes: ["id", "username", "email", "createdAt", "elo", "profile_picture"],
        });

        if (!user) {
            return res.status(404).json({ error: "Utilisateur non trouvé" });
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

router.get("/lookup-username", auth, async (req: AutRequest, res) => {
	try {
		if (!req.user) {
			return res.status(401).json({ error: "Non authentifié" });
		}
		const raw = req.query.username;
		const segment =
			typeof raw === "string"
				? raw
				: Array.isArray(raw)
					? String(raw[0] ?? "")
					: String(raw ?? "");
		const username = segment.trim();
		if (!isValidLookupUsername(username)) {
			return res.status(400).json({ error: "bad-username" });
		}
		const user = await findUserProfileBySlug(username);
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
			return res.redirect(`${frontendBaseUrl}/login.html?error=no_code`);
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
			{ expiresIn: JWT_EXPIRES_IN }
		);

		res.redirect(302, `${frontendBaseUrl}/login.html#token=${encodeURIComponent(jwtToken)}`);
	} catch (err) {
		console.error("OAuth 42 error:", err);
		const frontendBaseUrl = getFrontendBaseUrl(req.hostname);
		res.redirect(`${frontendBaseUrl}/login.html?error=auth_failed`);
	}
});

export default router;