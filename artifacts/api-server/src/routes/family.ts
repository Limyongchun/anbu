import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  familyGroupsTable,
  familyMembersTable,
  familyLocationsTable,
  familyMessagesTable,
} from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";

const router: IRouter = Router();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
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
    const [member] = await db.insert(familyMembersTable).values({
      familyCode: code,
      deviceId,
      memberName,
      role,
    }).returning();

    const members = await db.select().from(familyMembersTable).where(eq(familyMembersTable.familyCode, code));
    const [group] = await db.select().from(familyGroupsTable).where(eq(familyGroupsTable.code, code));

    return res.json({
      code: group.code,
      members: members.map(m => ({
        ...m,
        joinedAt: m.joinedAt.toISOString(),
      })),
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
    if (!group) {
      return res.status(404).json({ error: "Family group not found" });
    }

    // Check if already a member (update name/role if so)
    const existing = await db.select().from(familyMembersTable)
      .where(and(eq(familyMembersTable.familyCode, code), eq(familyMembersTable.deviceId, deviceId)));

    let member;
    if (existing.length > 0) {
      [member] = await db.update(familyMembersTable)
        .set({ memberName, role })
        .where(and(eq(familyMembersTable.familyCode, code), eq(familyMembersTable.deviceId, deviceId)))
        .returning();
    } else {
      [member] = await db.insert(familyMembersTable).values({
        familyCode: code,
        deviceId,
        memberName,
        role,
      }).returning();
    }

    return res.json({
      ...member,
      joinedAt: member.joinedAt.toISOString(),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to join family" });
  }
});

// GET /api/family/:code
router.get("/family/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const [group] = await db.select().from(familyGroupsTable).where(eq(familyGroupsTable.code, code));
    if (!group) return res.status(404).json({ error: "Family not found" });

    const members = await db.select().from(familyMembersTable).where(eq(familyMembersTable.familyCode, code));

    return res.json({
      code: group.code,
      members: members.map(m => ({ ...m, joinedAt: m.joinedAt.toISOString() })),
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
      .orderBy(desc(familyLocationsTable.updatedAt))
      .limit(1);

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
        familyCode: code,
        deviceId,
        memberName: memberName || "Unknown",
        latitude,
        longitude,
        address,
        accuracy,
        battery,
        isSharing: isSharing ?? true,
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
    const locs = await db.select().from(familyLocationsTable)
      .where(eq(familyLocationsTable.familyCode, code))
      .orderBy(desc(familyLocationsTable.updatedAt));

    // Return only the latest per deviceId
    const seen = new Set<string>();
    const unique = locs.filter(l => {
      if (seen.has(l.deviceId)) return false;
      seen.add(l.deviceId);
      return true;
    });

    return res.json(unique.map(l => ({ ...l, updatedAt: l.updatedAt.toISOString() })));
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
      .limit(50);

    return res.json(msgs.map(m => ({ ...m, createdAt: m.createdAt.toISOString() })));
  } catch (e) {
    return res.status(500).json({ error: "Failed to get messages" });
  }
});

// POST /api/family/:code/messages
router.post("/family/:code/messages", async (req, res) => {
  try {
    const { code } = req.params;
    const { fromName, fromRole, text } = req.body;
    if (!fromName || !fromRole || !text) {
      return res.status(400).json({ error: "fromName, fromRole, text required" });
    }

    const [msg] = await db.insert(familyMessagesTable).values({
      familyCode: code,
      fromName,
      fromRole,
      text,
      hearts: 0,
    }).returning();

    return res.json({ ...msg, createdAt: msg.createdAt.toISOString() });
  } catch (e) {
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

    return res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (e) {
    return res.status(500).json({ error: "Failed to heart message" });
  }
});

export default router;
