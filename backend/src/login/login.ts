
import bcrypt from "bcrypt";

import User from "../models/User";

import router from "../routes";

router.post("/login", async (req, res) => {

    const { username, password } = req.body;

    const user = await User.findOne({ where: { username } });
	
    const stored = user?.password;
    if (!user || !stored || typeof password !== "string" || !(await bcrypt.compare(password, stored)))
        return res.status(401).json({ error: "Identifiants incorrects" });
    res.json({ message: "Connecté", userId: user.id });
});