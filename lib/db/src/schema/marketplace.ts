import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const marketplaceListingsTable = pgTable("marketplace_listings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  price: text("price").notNull(),
  location: text("location").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("available"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type MarketplaceListing = typeof marketplaceListingsTable.$inferSelect;
export type InsertMarketplaceListing = typeof marketplaceListingsTable.$inferInsert;
