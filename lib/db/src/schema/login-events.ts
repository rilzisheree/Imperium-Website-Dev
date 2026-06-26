import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { staffMembersTable } from "./staff";

export const loginEventsTable = pgTable("login_events", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull().references(() => staffMembersTable.id),
  eventType: text("event_type").notNull(), // "login" | "logout" | "forced_out" | "session_conflict"
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  sessionId: text("session_id"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type LoginEvent = typeof loginEventsTable.$inferSelect;
