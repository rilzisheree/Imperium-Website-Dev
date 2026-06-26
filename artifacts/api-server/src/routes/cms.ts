import { Router } from "express";
import { eq, asc } from "drizzle-orm";
import { db } from "@workspace/db";
import { siteContentTable } from "@workspace/db";
import { requireStaff, requireOwner } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

// GET /api/cms — public: get all site content
router.get("/", async (req, res) => {
  try {
    const content = await db.select().from(siteContentTable).orderBy(asc(siteContentTable.section), asc(siteContentTable.key));
    const map: Record<string, string> = {};
    for (const item of content) map[item.key] = item.value;
    res.json(map);
  } catch (err) {
    logger.error({ err }, "Failed to get CMS content");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/cms/all — staff: get all with metadata
router.get("/all", requireStaff, async (req, res) => {
  try {
    const content = await db.select().from(siteContentTable).orderBy(asc(siteContentTable.section), asc(siteContentTable.key));
    res.json(content.map((c) => ({
      id: c.id, key: c.key, value: c.value, label: c.label,
      section: c.section, updatedByName: c.updatedByName ?? null,
      updatedAt: c.updatedAt.toISOString(),
    })));
  } catch (err) {
    logger.error({ err }, "Failed to get CMS content");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/cms/:key — staff: update a content item
router.patch("/:key", requireStaff, async (req, res) => {
  try {
    const key = req.params.key as string;
    const { value } = req.body;
    const session = (req as any).session;

    if (value === undefined || value === null) {
      res.status(400).json({ error: "Value is required" });
      return;
    }

    const [existing] = await db.select().from(siteContentTable).where(eq(siteContentTable.key, key)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "Content key not found" });
      return;
    }

    const [updated] = await db.update(siteContentTable)
      .set({ value: String(value), updatedByName: session.staffUsername, updatedAt: new Date() })
      .where(eq(siteContentTable.key, key))
      .returning();

    res.json({
      id: updated.id, key: updated.key, value: updated.value, label: updated.label,
      section: updated.section, updatedByName: updated.updatedByName ?? null,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Failed to update CMS content");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
