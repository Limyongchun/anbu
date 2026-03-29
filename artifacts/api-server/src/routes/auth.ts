import { Router } from "express";
import { db } from "@workspace/db";
import { accountsTable, familyMembersTable, familyLocationsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

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

async function findOrCreateSocialAccount(
  provider: "apple" | "google",
  providerId: string,
  email?: string | null,
  displayName?: string | null,
) {
  const col = provider === "apple" ? accountsTable.appleId : accountsTable.googleId;
  let [account] = await db.select().from(accountsTable).where(eq(col, providerId));

  if (!account) {
    const pseudoPhone = `${provider}:${providerId.substring(0, 40)}`;
    try {
      [account] = await db.insert(accountsTable).values({
        phone: pseudoPhone,
        ...(provider === "apple" ? { appleId: providerId } : { googleId: providerId }),
        displayName: displayName || null,
        email: email || null,
        authProvider: provider,
      }).returning();
    } catch (e: any) {
      if (e?.code === "23505" && e?.constraint?.includes("phone")) {
        const uniquePhone = `${provider}:${crypto.randomUUID().substring(0, 20)}`;
        [account] = await db.insert(accountsTable).values({
          phone: uniquePhone,
          ...(provider === "apple" ? { appleId: providerId } : { googleId: providerId }),
          displayName: displayName || null,
          email: email || null,
          authProvider: provider,
        }).returning();
      } else {
        throw e;
      }
    }
  } else {
    await db.update(accountsTable).set({
      updatedAt: new Date(),
      ...(displayName ? { displayName } : {}),
      ...(email ? { email } : {}),
    }).where(eq(accountsTable.id, account.id));
  }

  const memberships = await db.select().from(familyMembersTable).where(eq(familyMembersTable.accountId, account.id));
  return {
    accountId: account.id,
    displayName: account.displayName,
    email: account.email,
    existingFamilies: memberships.map(m => ({
      familyCode: m.familyCode,
      memberName: m.memberName,
      role: m.role,
      childRole: m.childRole,
      deviceId: m.deviceId,
    })),
  };
}

router.post("/auth/apple", async (req, res) => {
  const { identityToken, user, fullName, email } = req.body as {
    identityToken?: string;
    user?: string;
    fullName?: { givenName?: string; familyName?: string } | null;
    email?: string | null;
  };

  console.log("[auth/apple] request received, user:", user);

  if (!user) {
    return res.status(400).json({ error: "Apple 인증 정보가 없습니다" });
  }

  try {
    const name = fullName
      ? [fullName.familyName, fullName.givenName].filter(Boolean).join("")
      : null;

    const result = await findOrCreateSocialAccount("apple", user, email, name);
    console.log("[auth/apple] success, accountId:", result.accountId);
    return res.json({ success: true, ...result });
  } catch (e) {
    console.error("[auth/apple] error:", e);
    return res.status(500).json({ error: "Apple 로그인 처리 중 오류가 발생했습니다" });
  }
});

router.get("/auth/google/start", (req, res) => {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
  if (!clientId) {
    return res.status(500).send("Google Client ID not configured");
  }

  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  const callbackUrl = `${protocol}://${host}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: "token",
    scope: "openid profile email",
    include_granted_scopes: "true",
  });

  console.log("[auth/google/start] redirecting to Google, callback:", callbackUrl);
  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get("/auth/google/callback", (_req, res) => {
  res.send(`<!DOCTYPE html><html><body><script>
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    if (accessToken) {
      fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: "Bearer " + accessToken }
      })
      .then(r => r.json())
      .then(userInfo => {
        return fetch(window.location.origin + "/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken: accessToken,
            email: userInfo.email,
            name: userInfo.name,
          })
        });
      })
      .then(r => r.json())
      .then(result => {
        if (result.success && result.accountId) {
          const deepLink = "anbu://auth/google?accountId=" + result.accountId
            + "&email=" + encodeURIComponent(result.email || "")
            + "&name=" + encodeURIComponent(result.displayName || "");
          window.location.href = deepLink;
        } else {
          window.location.href = "anbu://auth/google?error=auth_failed";
        }
      })
      .catch(() => {
        window.location.href = "anbu://auth/google?error=network_error";
      });
    } else {
      window.location.href = "anbu://auth/google?error=no_token";
    }
  </script><p>로그인 처리 중...</p></body></html>`);
});

router.post("/auth/google", async (req, res) => {
  const { idToken, accessToken, email, name } = req.body as {
    idToken?: string;
    accessToken?: string;
    email?: string | null;
    name?: string | null;
  };

  console.log("[auth/google] request received, email:", email);

  if (!email && !idToken && !accessToken) {
    return res.status(400).json({ error: "Google 인증 정보가 없습니다" });
  }

  try {
    const googleId = email || idToken || accessToken || "";
    const result = await findOrCreateSocialAccount("google", googleId, email, name);
    console.log("[auth/google] success, accountId:", result.accountId);
    return res.json({ success: true, ...result });
  } catch (e) {
    console.error("[auth/google] error:", e);
    return res.status(500).json({ error: "Google 로그인 처리 중 오류가 발생했습니다" });
  }
});

router.delete("/account/:accountId", async (req, res) => {
  const accountId = Number(req.params.accountId);
  const { deviceId } = req.body as { deviceId?: string };

  if (!accountId || Number.isNaN(accountId)) {
    return res.status(400).json({ error: "유효한 계정 ID가 필요합니다" });
  }
  if (!deviceId) {
    return res.status(400).json({ error: "deviceId가 필요합니다" });
  }

  console.log("[account/delete] accountId:", accountId, "deviceId:", deviceId);

  try {
    const memberships = await db.select().from(familyMembersTable).where(eq(familyMembersTable.accountId, accountId));
    const ownsAccount = memberships.some(m => m.deviceId === deviceId);

    if (!ownsAccount) {
      const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, accountId));
      if (!account) {
        return res.status(404).json({ error: "계정을 찾을 수 없습니다" });
      }
      const deviceMemberships = await db.select().from(familyMembersTable).where(eq(familyMembersTable.deviceId, deviceId));
      const linkedToAccount = deviceMemberships.some(m => m.accountId === accountId);
      if (!linkedToAccount && memberships.length > 0) {
        return res.status(403).json({ error: "본인 계정만 삭제할 수 있습니다" });
      }
    }

    await db.transaction(async (tx) => {
      const allDeviceIds = new Set<string>();
      for (const m of memberships) {
        allDeviceIds.add(m.deviceId);
      }
      allDeviceIds.add(deviceId);

      for (const did of allDeviceIds) {
        await tx.delete(familyLocationsTable).where(eq(familyLocationsTable.deviceId, did));
      }

      await tx.delete(familyMembersTable).where(eq(familyMembersTable.accountId, accountId));

      const extraDeviceMembers = await tx.select().from(familyMembersTable).where(eq(familyMembersTable.deviceId, deviceId));
      for (const m of extraDeviceMembers) {
        await tx.delete(familyMembersTable).where(eq(familyMembersTable.id, m.id));
      }

      await tx.delete(accountsTable).where(eq(accountsTable.id, accountId));
    });

    console.log("[account/delete] success, accountId:", accountId);
    return res.json({ success: true });
  } catch (e) {
    console.error("[account/delete] error:", e);
    return res.status(500).json({ error: "계정 삭제 중 오류가 발생했습니다" });
  }
});

export default router;
