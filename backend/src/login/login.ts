import bcrypt from "bcrypt";
import User from "../models/User";
import router from "../routes";

router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.password)))
        return res.status(401).json({ error: "Identifiants incorrects" });
    res.json({ message: "Connecté", userId: user.id });
});
