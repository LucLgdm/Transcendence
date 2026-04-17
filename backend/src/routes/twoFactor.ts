import { Router } from "express";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import User from "../models/User";

const router = Router();

router.post("/setup", async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 1. Générer un secret
    const secret = speakeasy.generateSecret({
      name: `Transcendence (${user.email})`,
    });

    // 2. Sauvegarder le secret (non activé pour l’instant)
    user.twoFactorSecret = secret.base32;
    await user.save();

    // 3. Générer QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url as string);

    // 4. Envoyer au frontend
    res.json({
      qrCode,
      secret: secret.base32, // utile pour debug ou entrée manuelle
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "2FA setup failed" });
  }
});

router.post("/verify", async (req, res) => {
  const { userId, token } = req.body;

  const user = await User.findByPk(userId);
  if (!user || !user.twoFactorSecret) {
    return res.status(400).json({ error: "2FA not initialized" });
  }

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token,
  });

  if (!verified) {
    return res.status(401).json({ error: "Invalid token" });
  }

  await user.update({ twoFactorEnabled: true });

  res.json({ success: true });
});


export default router;