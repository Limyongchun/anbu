import { pgTable, serial, text, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const familyGroupsTable = pgTable("family_groups", {
  code: text("code").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const familyMembersTable = pgTable("family_members", {
  id: serial("id").primaryKey(),
  familyCode: text("family_code").notNull().references(() => familyGroupsTable.code),
  deviceId: text("device_id").notNull(),
  memberName: text("member_name").notNull(),
  role: text("role").notNull(),
  childRole: text("child_role"),
  photoData: text("photo_data"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const familyLocationsTable = pgTable("family_locations", {
  id: serial("id").primaryKey(),
  familyCode: text("family_code").notNull().references(() => familyGroupsTable.code),
  deviceId: text("device_id").notNull(),
  memberName: text("member_name").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  address: text("address"),
  accuracy: real("accuracy"),
  battery: real("battery"),
  isSharing: boolean("is_sharing").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const familyMessagesTable = pgTable("family_messages", {
  id: serial("id").primaryKey(),
  familyCode: text("family_code").notNull().references(() => familyGroupsTable.code),
  deviceId: text("device_id"),
  fromName: text("from_name").notNull(),
  fromRole: text("from_role").notNull(),
  text: text("text").notNull().default(""),
  photoData: text("photo_data"),
  hearts: integer("hearts").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const parentActivityLogsTable = pgTable("parent_activity_logs", {
  id: serial("id").primaryKey(),
  familyCode: text("family_code").notNull().references(() => familyGroupsTable.code),
  deviceId: text("device_id").notNull(),
  parentName: text("parent_name").notNull(),
  activityType: text("activity_type").notNull(),
  detail: text("detail"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFamilyGroupSchema = createInsertSchema(familyGroupsTable);
export const insertFamilyMemberSchema = createInsertSchema(familyMembersTable);
export const insertFamilyLocationSchema = createInsertSchema(familyLocationsTable);
export const insertFamilyMessageSchema = createInsertSchema(familyMessagesTable);

export type FamilyGroup = typeof familyGroupsTable.$inferSelect;
export type FamilyMember = typeof familyMembersTable.$inferSelect;
export type FamilyLocation = typeof familyLocationsTable.$inferSelect;
export type FamilyMessage = typeof familyMessagesTable.$inferSelect;
export type ParentActivityLog = typeof parentActivityLogsTable.$inferSelect;
