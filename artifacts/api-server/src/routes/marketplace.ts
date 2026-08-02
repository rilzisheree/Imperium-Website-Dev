import { Router } from "express";
import { eq, desc, ilike, and, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { marketplaceListingsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

function formatListing(l: typeof marketplaceListingsTable.$inferSelect) {
  return {
    id: l.id,
    name: l.name,
    description: l.description,
    imageUrl: l.imageUrl ?? null,
    price: l.price,
    location: l.location,
    category: l.category,
    status: l.status,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}

// GET /api/marketplace — public list with optional filters
router.get("/", async (req, res) => {
  try {
    const { category, status, search } = req.query as Record<string, string>;

    const conditions = [];
    if (category) conditions.push(eq(marketplaceListingsTable.category, category));
    if (status) conditions.push(eq(marketplaceListingsTable.status, status));
    if (search) conditions.push(ilike(marketplaceListingsTable.name, `%${search}%`));

    const results = await db
      .select()
      .from(marketplaceListingsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(marketplaceListingsTable.createdAt));

    res.json(results.map(formatListing));
  } catch (err) {
    logger.error({ err }, "Failed to list marketplace listings");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/marketplace/:listingId — public single
router.get("/:listingId", async (req, res) => {
  try {
    const listingId = parseInt(req.params.listingId as string);
    if (isNaN(listingId)) {
      res.status(400).json({ error: "Invalid listing ID" });
      return;
    }

    const [listing] = await db
      .select()
      .from(marketplaceListingsTable)
      .where(eq(marketplaceListingsTable.id, listingId))
      .limit(1);

    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    res.json(formatListing(listing));
  } catch (err) {
    logger.error({ err }, "Failed to get marketplace listing");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/staff/marketplace — admin only (create)
router.post("/", requireAdmin, async (req, res) => {
  try {
    const { name, description, imageUrl, price, location, category, status } = req.body;

    if (!name?.trim() || !description?.trim() || !price?.trim() || !location?.trim() || !category?.trim()) {
      res.status(400).json({ error: "Name, description, price, location, and category are required" });
      return;
    }

    const [listing] = await db
      .insert(marketplaceListingsTable)
      .values({
        name: name.trim(),
        description: description.trim(),
        imageUrl: imageUrl?.trim() || null,
        price: price.trim(),
        location: location.trim(),
        category: category.trim(),
        status: status ?? "available",
      })
      .returning();

    res.status(201).json(formatListing(listing));
  } catch (err) {
    logger.error({ err }, "Failed to create marketplace listing");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/staff/marketplace/:listingId — admin only (edit)
router.patch("/:listingId", requireAdmin, async (req, res) => {
  try {
    const listingId = parseInt(req.params.listingId as string);
    if (isNaN(listingId)) {
      res.status(400).json({ error: "Invalid listing ID" });
      return;
    }

    const [existing] = await db
      .select()
      .from(marketplaceListingsTable)
      .where(eq(marketplaceListingsTable.id, listingId))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    const { name, description, imageUrl, price, location, category, status } = req.body;
    const patch: Partial<typeof marketplaceListingsTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (name !== undefined) patch.name = name;
    if (description !== undefined) patch.description = description;
    if (imageUrl !== undefined) patch.imageUrl = imageUrl || null;
    if (price !== undefined) patch.price = price;
    if (location !== undefined) patch.location = location;
    if (category !== undefined) patch.category = category;
    if (status !== undefined) patch.status = status;

    const [updated] = await db
      .update(marketplaceListingsTable)
      .set(patch)
      .where(eq(marketplaceListingsTable.id, listingId))
      .returning();

    res.json(formatListing(updated));
  } catch (err) {
    logger.error({ err }, "Failed to update marketplace listing");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/staff/marketplace/:listingId — admin only
router.delete("/:listingId", requireAdmin, async (req, res) => {
  try {
    const listingId = parseInt(req.params.listingId as string);
    if (isNaN(listingId)) {
      res.status(400).json({ error: "Invalid listing ID" });
      return;
    }

    const [deleted] = await db
      .delete(marketplaceListingsTable)
      .where(eq(marketplaceListingsTable.id, listingId))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete marketplace listing");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
