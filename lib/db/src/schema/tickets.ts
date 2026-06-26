import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { staffMembersTable } from "./staff";

export const ticketsTable = pgTable("tickets", {
  id: serial("id").primaryKey(),
  ticketCode: text("ticket_code").notNull().unique(),
  accessCode: text("access_code").notNull().default(""),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  robloxUsername: text("roblox_username").notNull(),
  discordUsername: text("discord_username").notNull(),
  discordUserId: text("discord_user_id").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  reason: text("reason"),
  additionalInfo: text("additional_info"),
  assignedToId: integer("assigned_to_id").references(() => staffMembersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const ticketRepliesTable = pgTable("ticket_replies", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => ticketsTable.id),
  staffId: integer("staff_id").references(() => staffMembersTable.id),
  authorName: text("author_name").notNull(),
  authorRole: text("author_role").notNull().default("staff"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ticketNotesTable = pgTable("ticket_notes", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => ticketsTable.id),
  staffId: integer("staff_id").references(() => staffMembersTable.id),
  authorName: text("author_name").notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ticketEventsTable = pgTable("ticket_events", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => ticketsTable.id),
  eventType: text("event_type").notNull(),
  description: text("description").notNull(),
  actorName: text("actor_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTicketSchema = createInsertSchema(ticketsTable).omit({ id: true, createdAt: true, updatedAt: true, ticketCode: true });
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof ticketsTable.$inferSelect;
export type TicketReply = typeof ticketRepliesTable.$inferSelect;
export type TicketNote = typeof ticketNotesTable.$inferSelect;
export type TicketEvent = typeof ticketEventsTable.$inferSelect;
