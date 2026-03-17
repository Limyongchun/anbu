import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  familyGroupsTable,
  familyMembersTable,
  familyLocationsTable,
  familyMessagesTable,
  parentActivityLogsTable,
} from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";

const router: IRouter = Router();

const MAX_PARENTS = 2;
const MAX_CHILDREN = 10;

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function serializeMsg(m: typeof familyMessagesTable.$inferSelect) {
  return {
    id: m.id,
    familyCode: m.familyCode,
    deviceId: m.deviceId,
    fromName: m.fromName,
    fromRole: m.fromRole,
    text: m.text,
    photoData: m.photoData,
    hearts: m.hearts,
    createdAt: m.createdAt.toISOString(),
  };
}

function serializeMember(m: typeof familyMembersTable.$inferSelect) {
  return { ...m, joinedAt: m.joinedAt.toISOString() };
}

// POST /api/family/create
router.post("/family/create", async (req, res) => {
  try {
    const { deviceId, memberName, role } = req.body;
    if (!deviceId || !memberName || !role) {
      return res.status(400).json({ error: "deviceId, memberName, role are required" });
    }
    let code = generateCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.select().from(familyGroupsTable).where(eq(familyGroupsTable.code, code));
      if (existing.length === 0) break;
      code = generateCode();
      attempts++;
    }
    await db.insert(familyGroupsTable).values({ code });
    const childRole = role === "child" ? "master" : null;
    await db.insert(familyMembersTable).values({ familyCode: code, deviceId, memberName, role, childRole });
    const members = await db.select().from(familyMembersTable).where(eq(familyMembersTable.familyCode, code));
    const [group] = await db.select().from(familyGroupsTable).where(eq(familyGroupsTable.code, code));
    return res.json({
      code: group.code,
      childRole,
      members: members.map(serializeMember),
      createdAt: group.createdAt.toISOString(),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to create family" });
  }
});

// POST /api/family/join
router.post("/family/join", async (req, res) => {
  try {
    const { code, deviceId, memberName, role } = req.body;
    if (!code || !deviceId || !memberName || !role) {
      return res.status(400).json({ error: "code, deviceId, memberName, role are required" });
    }
    const [group] = await db.select().from(familyGroupsTable).where(eq(familyGroupsTable.code, code));
    if (!group) return res.status(404).json({ error: "Family group not found" });

    const allMembers = await db.select().from(familyMembersTable).where(eq(familyMembersTable.familyCode, code));

    const selfExisting = allMembers.filter(m => m.deviceId === deviceId);

    if (selfExisting.length === 0) {
      if (role === "parent") {
        const parentCount = allMembers.filter(m => m.role === "parent").length;
        if (parentCount >= MAX_PARENTS) {
          return res.status(409).json({ error: `부모님은 최대 ${MAX_PARENTS}명까지 연결할 수 있습니다` });
        }
      }
      if (role === "child") {
        const childCount = allMembers.filter(m => m.role === "child").length;
        if (childCount >= MAX_CHILDREN) {
          return res.status(409).json({ error: `자녀는 최대 ${MAX_CHILDREN}명까지 연결할 수 있습니다` });
        }
      }
    }

    const hasMasterChild = allMembers.some(m => m.role === "child" && m.childRole === "master");
    const childRole = role === "child" ? (hasMasterChild ? "sub" : "master") : null;

    let member;
    if (selfExisting.length > 0) {
      [member] = await db.update(familyMembersTable)
        .set({ memberName, role, childRole })
        .where(and(eq(familyMembersTable.familyCode, code), eq(familyMembersTable.deviceId, deviceId)))
        .returning();
    } else {
      [member] = await db.insert(familyMembersTable).values({ familyCode: code, deviceId, memberName, role, childRole }).returning();

    }
    return res.json({ ...serializeMember(member), childRole });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to join family" });
  }
});

// POST /api/family/:code/leave — 본인이 가족에서 탈퇴
router.post("/family/:code/leave", async (req, res) => {
  try {
    const { code } = req.params;
    const { deviceId } = req.body;
    if (!deviceId) return res.status(400).json({ error: "deviceId required" });
    const member = await db.select().from(familyMembersTable)
      .where(and(eq(familyMembersTable.familyCode, code), eq(familyMembersTable.deviceId, deviceId)))
      .then(r => r[0]);
    if (!member) return res.status(404).json({ error: "Member not found" });
    if (member.childRole === "master") return res.status(400).json({ error: "Master child cannot leave" });
    await db.delete(familyMembersTable)
      .where(and(eq(familyMembersTable.familyCode, code), eq(familyMembersTable.deviceId, deviceId)));
    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to leave family" });
  }
});

// DELETE /api/family/:code/member/:memberDeviceId — 마스터 자녀가 서브 자녀 삭제
router.delete("/family/:code/member/:memberDeviceId", async (req, res) => {
  try {
    const { code, memberDeviceId } = req.params;
    const { requestorDeviceId } = req.body;

    const members = await db.select().from(familyMembersTable).where(eq(familyMembersTable.familyCode, code));
    const requestor = members.find(m => m.deviceId === requestorDeviceId);
    if (!requestor || requestor.childRole !== "master") {
      return res.status(403).json({ error: "마스터 자녀만 삭제할 수 있습니다" });
    }
    const target = members.find(m => m.deviceId === memberDeviceId);
    if (!target) return res.status(404).json({ error: "대상 자녀를 찾을 수 없습니다" });
    if (target.childRole === "master") return res.status(400).json({ error: "마스터 자녀는 삭제할 수 없습니다" });

    await db.delete(familyMembersTable)
      .where(and(eq(familyMembersTable.familyCode, code), eq(familyMembersTable.deviceId, memberDeviceId)));

    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to remove member" });
  }
});

// GET /api/family/:code
router.get("/family/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const [group] = await db.select().from(familyGroupsTable).where(eq(familyGroupsTable.code, code));
    if (!group) return res.status(404).json({ error: "Family not found" });
    const members = await db.select().from(familyMembersTable).where(eq(familyMembersTable.familyCode, code));
    const parentCount = members.filter(m => m.role === "parent").length;
    const childCount = members.filter(m => m.role === "child").length;
    return res.json({
      code: group.code,
      members: members.map(serializeMember),
      parentCount,
      childCount,
      maxParents: MAX_PARENTS,
      maxChildren: MAX_CHILDREN,
      createdAt: group.createdAt.toISOString(),
    });
  } catch (e) {
    return res.status(500).json({ error: "Failed to get family" });
  }
});

// GET /api/family/:code/location?deviceId=xxx
router.get("/family/:code/location", async (req, res) => {
  try {
    const { code } = req.params;
    const { deviceId } = req.query;
    if (!deviceId) return res.status(400).json({ error: "deviceId required" });
    const locs = await db.select().from(familyLocationsTable)
      .where(and(eq(familyLocationsTable.familyCode, code), eq(familyLocationsTable.deviceId, String(deviceId))))
      .orderBy(desc(familyLocationsTable.updatedAt)).limit(1);
    if (locs.length === 0) return res.status(404).json({ error: "No location found" });
    const loc = locs[0];
    return res.json({ ...loc, updatedAt: loc.updatedAt.toISOString() });
  } catch (e) {
    return res.status(500).json({ error: "Failed to get location" });
  }
});

// PUT /api/family/:code/location
router.put("/family/:code/location", async (req, res) => {
  try {
    const { code } = req.params;
    const { deviceId, memberName, latitude, longitude, address, accuracy, battery, isSharing } = req.body;
    if (!deviceId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "deviceId, latitude, longitude required" });
    }
    const existing = await db.select().from(familyLocationsTable)
      .where(and(eq(familyLocationsTable.familyCode, code), eq(familyLocationsTable.deviceId, deviceId)));
    let loc;
    if (existing.length > 0) {
      [loc] = await db.update(familyLocationsTable)
        .set({ memberName, latitude, longitude, address, accuracy, battery, isSharing, updatedAt: new Date() })
        .where(and(eq(familyLocationsTable.familyCode, code), eq(familyLocationsTable.deviceId, deviceId)))
        .returning();
    } else {
      [loc] = await db.insert(familyLocationsTable).values({
        familyCode: code, deviceId, memberName: memberName || "Unknown",
        latitude, longitude, address, accuracy, battery, isSharing: isSharing ?? true,
      }).returning();
    }
    return res.json({ ...loc, updatedAt: loc.updatedAt.toISOString() });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to update location" });
  }
});

// GET /api/family/:code/locations
router.get("/family/:code/locations", async (req, res) => {
  try {
    const { code } = req.params;
    const [locs, members] = await Promise.all([
      db.select().from(familyLocationsTable)
        .where(eq(familyLocationsTable.familyCode, code))
        .orderBy(desc(familyLocationsTable.updatedAt)),
      db.select().from(familyMembersTable)
        .where(eq(familyMembersTable.familyCode, code)),
    ]);
    const memberMap = new Map(members.map(m => [m.deviceId, m]));
    const seen = new Set<string>();
    const unique = locs.filter(l => { if (seen.has(l.deviceId)) return false; seen.add(l.deviceId); return true; });
    return res.json(unique.map(l => {
      const member = memberMap.get(l.deviceId);
      return {
        ...l,
        role: member?.role || "unknown",
        privacyMode: member?.privacyMode ?? false,
        updatedAt: l.updatedAt.toISOString(),
      };
    }));
  } catch (e) {
    return res.status(500).json({ error: "Failed to get locations" });
  }
});

// GET /api/family/:code/messages
router.get("/family/:code/messages", async (req, res) => {
  try {
    const { code } = req.params;
    const msgs = await db.select().from(familyMessagesTable)
      .where(eq(familyMessagesTable.familyCode, code))
      .orderBy(desc(familyMessagesTable.createdAt))
      .limit(100);
    return res.json(msgs.map(serializeMsg));
  } catch (e) {
    return res.status(500).json({ error: "Failed to get messages" });
  }
});

// POST /api/family/:code/messages
router.post("/family/:code/messages", async (req, res) => {
  try {
    const { code } = req.params;
    const { deviceId, fromName, fromRole, text, photoData } = req.body;
    if (!fromName || !fromRole) {
      return res.status(400).json({ error: "fromName, fromRole required" });
    }
    if (!text && !photoData) {
      return res.status(400).json({ error: "text or photoData required" });
    }
    const [msg] = await db.insert(familyMessagesTable).values({
      familyCode: code,
      deviceId: deviceId || null,
      fromName,
      fromRole,
      text: text || "",
      photoData: photoData || null,
      hearts: 0,
    }).returning();
    return res.json(serializeMsg(msg));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to send message" });
  }
});

// POST /api/family/:code/messages/:messageId/heart
router.post("/family/:code/messages/:messageId/heart", async (req, res) => {
  try {
    const { code, messageId } = req.params;
    const id = parseInt(messageId);
    const [msg] = await db.select().from(familyMessagesTable)
      .where(and(eq(familyMessagesTable.id, id), eq(familyMessagesTable.familyCode, code)));
    if (!msg) return res.status(404).json({ error: "Message not found" });
    const [updated] = await db.update(familyMessagesTable)
      .set({ hearts: msg.hearts + 1 })
      .where(eq(familyMessagesTable.id, id))
      .returning();
    return res.json(serializeMsg(updated));
  } catch (e) {
    return res.status(500).json({ error: "Failed to heart message" });
  }
});

// DELETE /api/family/:code/messages/:messageId
router.delete("/family/:code/messages/:messageId", async (req, res) => {
  try {
    const { code, messageId } = req.params;
    const { deviceId } = req.query;
    const id = parseInt(messageId);
    if (deviceId) {
      await db.delete(familyMessagesTable).where(
        and(
          eq(familyMessagesTable.id, id),
          eq(familyMessagesTable.familyCode, code),
          eq(familyMessagesTable.deviceId, String(deviceId))
        )
      );
    } else {
      await db.delete(familyMessagesTable).where(
        and(eq(familyMessagesTable.id, id), eq(familyMessagesTable.familyCode, code))
      );
    }
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: "Failed to delete message" });
  }
});

// PATCH /api/family/:code/member/:deviceId/privacy
router.patch("/family/:code/member/:deviceId/privacy", async (req, res) => {
  try {
    const { code, deviceId } = req.params;
    const { privacyMode } = req.body;
    if (typeof privacyMode !== "boolean") return res.status(400).json({ error: "privacyMode (boolean) required" });
    const member = await db.select().from(familyMembersTable)
      .where(and(eq(familyMembersTable.familyCode, code), eq(familyMembersTable.deviceId, deviceId)))
      .then(r => r[0]);
    if (!member) return res.status(404).json({ error: "Member not found" });
    if (member.role !== "parent") return res.status(403).json({ error: "Only parents can toggle privacy mode" });
    const [updated] = await db.update(familyMembersTable)
      .set({ privacyMode })
      .where(and(eq(familyMembersTable.familyCode, code), eq(familyMembersTable.deviceId, deviceId)))
      .returning();
    return res.json({ success: true, privacyMode: updated!.privacyMode });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to update privacy mode" });
  }
});

// PATCH /api/family/:code/member/:deviceId/photo
router.patch("/family/:code/member/:deviceId/photo", async (req, res) => {
  try {
    const { code, deviceId } = req.params;
    const { photoData } = req.body;
    if (!photoData) return res.status(400).json({ error: "photoData required" });
    await db.update(familyMembersTable)
      .set({ photoData })
      .where(and(eq(familyMembersTable.familyCode, code), eq(familyMembersTable.deviceId, deviceId)));
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: "Failed to update photo" });
  }
});

// POST /api/family/:code/activity — log a parent activity
router.post("/family/:code/activity", async (req, res) => {
  try {
    const { code } = req.params;
    const { deviceId, parentName, activityType, detail } = req.body;
    if (!deviceId || !parentName || !activityType) {
      return res.status(400).json({ error: "deviceId, parentName, activityType required" });
    }
    const [log] = await db.insert(parentActivityLogsTable).values({
      familyCode: code,
      deviceId,
      parentName,
      activityType,
      detail: detail || null,
    }).returning();
    return res.json(log);
  } catch (e) {
    return res.status(500).json({ error: "Failed to log activity" });
  }
});

// GET /api/family/:code/activities — get parent activity logs
router.get("/family/:code/activities", async (req, res) => {
  try {
    const { code } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
    const logs = await db.select().from(parentActivityLogsTable)
      .where(eq(parentActivityLogsTable.familyCode, code))
      .orderBy(desc(parentActivityLogsTable.createdAt))
      .limit(limit);
    return res.json(logs);
  } catch (e) {
    return res.status(500).json({ error: "Failed to fetch activities" });
  }
});

export default router;
