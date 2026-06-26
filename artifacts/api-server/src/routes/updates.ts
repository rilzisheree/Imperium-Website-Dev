import { Router } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { updatesTable, staffMembersTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

function formatUpdate(u: typeof updatesTable.$inferSelect) {
  return {
    id: u.id,
    title: u.title,
    content: u.content,
    category: u.category,
    authorName: u.authorName,
    pinned: u.pinned,
    imageUrl: u.imageUrl ?? null,
    publishedAt: u.publishedAt.toISOString(),
    createdAt: u.createdAt.toISOString(),
  };
}

// GET /api/updates — public
router.get("/", async (req, res) => {
  try {
    const { category, pinned, page = "1" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limit = 20;
    const offset = (pageNum - 1) * limit;

    let query = db.select().from(updatesTable);
    const conditions: ReturnType<typeof eq>[] = [];
    if (category) conditions.push(eq(updatesTable.category, category));
    if (pinned === "true") conditions.push(eq(updatesTable.pinned, true));

    const results = await db
      .select()
      .from(updatesTable)
      .where(conditions.length > 0 ? sql`${conditions.reduce((acc, c) => sql`${acc} AND ${c}`)}` : undefined)
      .orderBy(desc(updatesTable.pinned), desc(updatesTable.publishedAt))
      .limit(limit)
      .offset(offset);

    res.json(results.map(formatUpdate));
  } catch (err) {
    logger.error({ err }, "Failed to list updates");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/updates/:id — public
router.get("/:updateId", async (req, res) => {
  try {
    const updateId = parseInt(req.params.updateId as string);
    if (isNaN(updateId)) {
      res.status(400).json({ error: "Invalid update ID" });
      return;
    }

    const [update] = await db.select().from(updatesTable).where(eq(updatesTable.id, updateId)).limit(1);
    if (!update) {
      res.status(404).json({ error: "Update not found" });
      return;
    }

    res.json(formatUpdate(update));
  } catch (err) {
    logger.error({ err }, "Failed to get update");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/staff/updates — admin only
router.post("/staff", requireAdmin, async (req, res) => {
  try {
    const { title, content, category, pinned, imageUrl } = req.body;
    const session = (req as any).session;

    if (!title?.trim() || !content?.trim() || !category?.trim()) {
      res.status(400).json({ error: "Title, content, and category are required" });
      return;
    }

    const [staffMember] = await db.select().from(staffMembersTable).where(eq(staffMembersTable.id, session.staffId)).limit(1);

    const [update] = await db.insert(updatesTable).values({
      title: title.trim(),
      content: content.trim(),
      category: category.trim(),
      authorName: staffMember?.username ?? "Staff",
      pinned: pinned ?? false,
      imageUrl: imageUrl ?? null,
    }).returning();

    res.status(201).json(formatUpdate(update));
  } catch (err) {
    logger.error({ err }, "Failed to create update");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/staff/updates/:id — admin only
router.delete("/staff/:updateId", requireAdmin, async (req, res) => {
  try {
    const updateId = parseInt(req.params.updateId as string);
    if (isNaN(updateId)) {
      res.status(400).json({ error: "Invalid update ID" });
      return;
    }
    const [deleted] = await db.delete(updatesTable).where(eq(updatesTable.id, updateId)).returning();
    if (!deleted) {
      res.status(404).json({ error: "Update not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete update");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/staff/updates/:id — admin only
router.patch("/staff/:updateId", requireAdmin, async (req, res) => {
  try {
    const updateId = parseInt(req.params.updateId as string);
    const { title, content, category, pinned, imageUrl } = req.body;

    const [existing] = await db.select().from(updatesTable).where(eq(updatesTable.id, updateId)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "Update not found" });
      return;
    }

    const patch: Partial<typeof updatesTable.$inferInsert> = {};
    if (title !== undefined) patch.title = title;
    if (content !== undefined) patch.content = content;
    if (category !== undefined) patch.category = category;
    if (pinned !== undefined) patch.pinned = pinned;
    if (imageUrl !== undefined) patch.imageUrl = imageUrl;

    const [updated] = await db.update(updatesTable).set(patch).where(eq(updatesTable.id, updateId)).returning();

    res.json(formatUpdate(updated));
  } catch (err) {
    logger.error({ err }, "Failed to edit update");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
