"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const User_1 = __importDefault(require("../models/User"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const sequelize_1 = require("sequelize");
const middleware_1 = require("../middleware");
const axios_1 = __importDefault(require("axios"));
const database_1 = __importDefault(require("../config/database"));
const userAuthInput_1 = require("../validation/userAuthInput");
const router = (0, express_1.Router)();
async function findUserProfileBySlug(username) {
    return User_1.default.findOne({
        where: database_1.default.where((0, sequelize_1.fn)("LOWER", (0, sequelize_1.col)("username")), username.toLowerCase()),
        attributes: ["id", "username", "email", "createdAt", "elo", "profile_picture"],
    });
}
const getFrontendBaseUrl = (hostName) => {
    const configured = process.env.FRONTEND_BASE_URL;
    if (configured) {
        return configured;
    }
    return `http://${hostName}:8080`;
};
router.post("/", async (req, res) => {
    try {
        const user = await User_1.default.create(req.body);
        res.status(201).json(user);
    }
    catch (err) {
        res.status(400).json({ error: "Invalid payload" });
    }
});
router.get("/", async (_req, res) => {
    const users = await User_1.default.findAll();
    res.json(users);
});
router.post("/register", async (req, res) => {
    try {
        const parsed = (0, userAuthInput_1.parseRegisterBody)(req.body);
        if (!parsed.ok) {
            return res.status(400).json({ error: parsed.error });
        }
        const { username, email, password } = parsed;
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        await User_1.default.create({ username, email, password: hashedPassword });
        res.status(201).json({ message: "Utilisateur créé" });
    }
    catch (err) {
        res.status(400).json({ error: "Utilisateur déjà existant ou données invalides" });
    }
});
router.post("/login", async (req, res) => {
    try {
        const parsed = (0, userAuthInput_1.parseLoginBody)(req.body);
        if (!parsed.ok) {
            return res.status(400).json({ error: parsed.error });
        }
        const { username, password } = parsed;
        const user = await User_1.default.findOne({ where: { username } });
        if (!user || !user.password)
            return res.status(401).json({ error: "Identifiants incorrects" });
        const validPassword = await bcrypt_1.default.compare(password, user.password);
        if (!validPassword)
            return res.status(401).json({ error: "Identifiants incorrects" });
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || "secret", { expiresIn: "24h" });
        res.json({ token });
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
router.get("/me", middleware_1.auth, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Non authentifié" });
        }
        const user = await User_1.default.findByPk(req.user.id, {
            attributes: ["id", "username", "email", "createdAt", "elo", "profile_picture"],
        });
        if (!user) {
            return res.status(404).json({ error: "Utilisateur non trouvé" });
        }
        res.json(user);
    }
    catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});
router.get("/lookup-username", middleware_1.auth, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Non authentifié" });
        }
        const raw = req.query.username;
        const segment = typeof raw === "string"
            ? raw
            : Array.isArray(raw)
                ? String(raw[0] ?? "")
                : String(raw ?? "");
        const username = segment.trim();
        if (!(0, userAuthInput_1.isValidLookupUsername)(username)) {
            return res.status(400).json({ error: "bad-username" });
        }
        const user = await findUserProfileBySlug(username);
        if (!user) {
            return res.status(404).json({ error: "Utilisateur non trouvé" });
        }
        res.json(user);
    }
    catch (err) {
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
        const tokenResponse = await axios_1.default.post("https://api.intra.42.fr/oauth/token", {
            grant_type: "authorization_code",
            client_id: process.env.OAUTH_42_UID,
            client_secret: process.env.OAUTH_42_SECRET,
            code,
            redirect_uri: process.env.OAUTH_42_CALLBACK_URL,
        });
        const accessToken = tokenResponse.data.access_token;
        // 2. Récupère les infos utilisateur depuis l'API 42
        const userResponse = await axios_1.default.get("https://api.intra.42.fr/v2/me", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        const userData = userResponse.data;
        const login42 = userData.login;
        const email = userData.email;
        const profilePicture = userData.image?.link;
        // 3. Cherche ou crée l'utilisateur
        let user = await User_1.default.findOne({ where: { login_42: login42 } });
        if (!user) {
            // Crée un nouvel utilisateur
            user = await User_1.default.create({
                username: login42,
                email,
                login_42: login42,
                profile_picture: profilePicture,
            });
        }
        else {
            // Met à jour les infos (en cas de changement)
            await user.update({
                email,
                profile_picture: profilePicture,
            });
        }
        // 4. Génère un JWT pour la session
        const jwtToken = jsonwebtoken_1.default.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || "secret", { expiresIn: "24h" });
        // 5. Redirige vers le frontend avec le token
        res.redirect(`${frontendBaseUrl}/index.html?token=${jwtToken}`);
    }
    catch (err) {
        console.error("OAuth 42 error:", err);
        const frontendBaseUrl = getFrontendBaseUrl(req.hostname);
        res.redirect(`${frontendBaseUrl}/?error=auth_failed`);
    }
});
exports.default = router;
