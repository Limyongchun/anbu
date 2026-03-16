import { Router } from "express";
import QRCode from "qrcode";

const router = Router();

// GET /api/qr/:code  →  PNG 이미지 (Buffer)
router.get("/qr/:code", async (req, res) => {
  const { code } = req.params;
  if (!code || code.length > 20) {
    return res.status(400).send("Invalid code");
  }
  try {
    const buffer = await QRCode.toBuffer(code, {
      type: "png",
      width: 300,
      margin: 2,
      color: { dark: "#1a2535", light: "#ffffff" },
    });
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.send(buffer);
  } catch (e) {
    console.error(e);
    return res.status(500).send("QR generation failed");
  }
});

export default router;
