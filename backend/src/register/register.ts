import bcrypt from "bcrypt";
import User from "../models/User";
import router from "../routes";

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