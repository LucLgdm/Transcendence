import bcrypt from "bcrypt";
import User from "../models/User";
import router from "../routes";

router.post("/login", async (req, res) => {
	const { username, password } = req.body;
	const user = await User.findOne({ where: { username } });
	if (!user || !(await bcrypt.compare(password, user.password)))
		return res.status(401).json({ error: "Identifiants incorrects" });
	if (user.twoFactorEnabled) {
		return res.json({
			requires2FA: true,
			userId: user.id,
		});
	}
	res.json({ message: "Connecté", userId: user.id });
});

router.post("/login", async (req, res) => {
	try {
		const { username, password } = req.body;

		const user = await User.findOne({ where: { username } });

		if (!user || !(await bcrypt.compare(password, user.password))) {
			return res.status(401).json({ error: "Identifiants incorrects" });
		}

		// 1. Sécurité : vérification cohérence 2FA
		if (user.twoFactorEnabled && !user.twoFactorSecret) {
			return res.status(500).json({ error: "2FA misconfigured" });
		}

		// 2. Cas 2FA activé
		if (user.twoFactorEnabled) {
			return res.json({
				requires2FA: true,
				userId: user.id,
			});
		}

		// 3. Login normal
		return res.json({
			message: "Connecté",
			userId: user.id,
		});

	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Server error" });
	}
});