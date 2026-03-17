import { Router } from "express";
import { db } from "@workspace/db";
import { accountsTable, familyMembersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

const otpStore = new Map<string, { code: string; expiresAt: number }>();

const generate = () => String(Math.floor(100000 + Math.random() * 900000));

router.post("/auth/send-otp", (req, res) => {
  const { phone } = req.body as { phone?: string };
  if (!phone || phone.length < 8) {
    return res.status(400).json({ error: "유효한 전화번호를 입력해주세요" });
  }
  const code = generate();
  otpStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
  console.log(`[OTP] ${phone} → ${code}`);
  return res.json({ success: true, devCode: code });
});

router.post("/auth/verify-otp", async (req, res) => {
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

  try {
    let [account] = await db.select().from(accountsTable).where(eq(accountsTable.phone, phone));
    if (!account) {
      [account] = await db.insert(accountsTable).values({ phone }).returning();
    } else {
      await db.update(accountsTable).set({ updatedAt: new Date() }).where(eq(accountsTable.id, account.id));
    }

    const memberships = await db.select().from(familyMembersTable).where(eq(familyMembersTable.accountId, account.id));
    const families = memberships.map(m => ({
      familyCode: m.familyCode,
      memberName: m.memberName,
      role: m.role,
      childRole: m.childRole,
      deviceId: m.deviceId,
    }));

    return res.json({
      success: true,
      accountId: account.id,
      phone: account.phone,
      existingFamilies: families,
    });
  } catch (e) {
    console.error("[auth/verify-otp] account error:", e);
    return res.status(500).json({ error: "계정 처리 중 오류가 발생했습니다" });
  }
});

export default router;
