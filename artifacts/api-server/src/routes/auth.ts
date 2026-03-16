import { Router } from "express";

const router = Router();

// ── 인메모리 OTP 저장소 ──────────────────────────────────────────────────────
const otpStore = new Map<string, { code: string; expiresAt: number }>();

const generate = () => String(Math.floor(100000 + Math.random() * 900000));

// POST /api/auth/send-otp
router.post("/auth/send-otp", (req, res) => {
  const { phone } = req.body as { phone?: string };
  if (!phone || phone.length < 8) {
    return res.status(400).json({ error: "유효한 전화번호를 입력해주세요" });
  }
  const code = generate();
  otpStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 }); // 5분 유효
  console.log(`[OTP] ${phone} → ${code}`); // 실제 배포시 Twilio SMS 전송
  return res.json({ success: true, devCode: code }); // dev 환경에서만 코드 반환
});

// POST /api/auth/verify-otp
router.post("/auth/verify-otp", (req, res) => {
  const { phone, otp } = req.body as { phone?: string; otp?: string };
  if (!phone || !otp) return res.status(400).json({ error: "입력값 누락" });
  const entry = otpStore.get(phone);
  if (!entry) return res.status(400).json({ error: "인증번호를 먼저 요청하세요" });
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    return res.status(400).json({ error: "인증번호가 만료됐습니다. 다시 요청해주세요" });
  }
  if (entry.code !== otp.trim()) {
    return res.status(400).json({ error: "인증번호가 올바르지 않습니다" });
  }
  otpStore.delete(phone);
  return res.json({ success: true });
});

export default router;
