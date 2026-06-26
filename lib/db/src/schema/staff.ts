import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const staffMembersTable = pgTable("staff_members", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("moderator"),
  activeSessionId: text("active_session_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStaffMemberSchema = createInsertSchema(staffMembersTable).omit({ id: true, createdAt: true, activeSessionId: true });
export type InsertStaffMember = z.infer<typeof insertStaffMemberSchema>;
export type StaffMember = typeof staffMembersTable.$inferSelect;
