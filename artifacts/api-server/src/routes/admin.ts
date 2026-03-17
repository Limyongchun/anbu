import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import {
  familyGroupsTable,
  familyMembersTable,
} from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";

const router: IRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const TOKEN_EXPIRY = "8h";

if (!JWT_SECRET || !ADMIN_PASSWORD) {
  console.warn("WARNING: ADMIN_PASSWORD or JWT_SECRET not set. Admin endpoints will be disabled.");
}

function adminAuth(req: Request, res: Response, next: NextFunction) {
  if (!JWT_SECRET) return res.status(503).json({ error: "Admin not configured" });
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as { role?: string };
    if (decoded.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

router.post("/admin/login", (req: Request, res: Response) => {
  if (!ADMIN_PASSWORD || !JWT_SECRET) {
    return res.status(503).json({ error: "Admin not configured" });
  }
  const { password } = req.body;
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "잘못된 비밀번호입니다" });
  }
  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  return res.json({ token });
});

router.get("/admin/stats", adminAuth, async (_req: Request, res: Response) => {
  try {
    const [familyCount] = await db.select({ count: sql<number>`count(*)` }).from(familyGroupsTable);
    const [memberCount] = await db.select({ count: sql<number>`count(*)` }).from(familyMembersTable);
    const [parentCount] = await db.select({ count: sql<number>`count(*)` }).from(familyMembersTable).where(eq(familyMembersTable.role, "parent"));
    const [childCount] = await db.select({ count: sql<number>`count(*)` }).from(familyMembersTable).where(eq(familyMembersTable.role, "child"));
    return res.json({
      families: Number(familyCount.count),
      members: Number(memberCount.count),
      parents: Number(parentCount.count),
      children: Number(childCount.count),
    });
  } catch (e) {
    return res.status(500).json({ error: "Failed to get stats" });
  }
});

router.get("/admin/families", adminAuth, async (_req: Request, res: Response) => {
  try {
    const groups = await db.select().from(familyGroupsTable).orderBy(desc(familyGroupsTable.createdAt));
    const members = await db.select().from(familyMembersTable);
    const membersByCode: Record<string, typeof members> = {};
    members.forEach(m => {
      if (!membersByCode[m.familyCode]) membersByCode[m.familyCode] = [];
      membersByCode[m.familyCode].push(m);
    });
    const result = groups.map(g => ({
      code: g.code,
      createdAt: g.createdAt.toISOString(),
      memberCount: (membersByCode[g.code] || []).length,
      parentCount: (membersByCode[g.code] || []).filter(m => m.role === "parent").length,
      childCount: (membersByCode[g.code] || []).filter(m => m.role === "child").length,
    }));
    return res.json({ families: result });
  } catch (e) {
    return res.status(500).json({ error: "Failed to get families" });
  }
});

router.get("/admin/families/:code", adminAuth, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const [group] = await db.select().from(familyGroupsTable).where(eq(familyGroupsTable.code, code));
    if (!group) return res.status(404).json({ error: "Family not found" });
    const members = await db.select().from(familyMembersTable).where(eq(familyMembersTable.familyCode, code));
    return res.json({
      code: group.code,
      createdAt: group.createdAt.toISOString(),
      members: members.map(m => ({ ...m, joinedAt: m.joinedAt.toISOString(), photoData: undefined })),
    });
  } catch (e) {
    return res.status(500).json({ error: "Failed to get family detail" });
  }
});

router.delete("/admin/families/:code", adminAuth, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    await db.delete(familyMembersTable).where(eq(familyMembersTable.familyCode, code));
    await db.delete(familyGroupsTable).where(eq(familyGroupsTable.code, code));
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: "Failed to delete family" });
  }
});

router.get("/admin/members", adminAuth, async (_req: Request, res: Response) => {
  try {
    const members = await db.select().from(familyMembersTable).orderBy(desc(familyMembersTable.joinedAt));
    return res.json({
      members: members.map(m => ({ ...m, joinedAt: m.joinedAt.toISOString(), photoData: undefined })),
    });
  } catch (e) {
    return res.status(500).json({ error: "Failed to get members" });
  }
});

router.delete("/admin/members/:id", adminAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [member] = await db.select().from(familyMembersTable).where(eq(familyMembersTable.id, id));
    if (!member) return res.status(404).json({ error: "Member not found" });
    await db.delete(familyMembersTable).where(eq(familyMembersTable.id, id));
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: "Failed to delete member" });
  }
});

export default router;
