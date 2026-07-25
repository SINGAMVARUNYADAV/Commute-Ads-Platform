import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, dynamicContentTable } from "@workspace/db";
import {
  ListDynamicContentQueryParams,
  ListDynamicContentResponse,
  CreateDynamicContentBody,
  CreateDynamicContentResponse,
  GetDynamicContentParams,
  GetDynamicContentResponse,
  UpdateDynamicContentParams,
  UpdateDynamicContentBody,
  UpdateDynamicContentResponse,
  DeleteDynamicContentParams,
  PushBreakingNewsBody,
  PushBreakingNewsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatContent(c: typeof dynamicContentTable.$inferSelect) {
  return {
    ...c,
    validUntil: c.validUntil.toISOString(),
  };
}

// Must be before /dynamic-content/:id to avoid route conflict
router.post("/dynamic-content/push-breaking-news", async (req, res): Promise<void> => {
  const parsed = PushBreakingNewsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const validUntil = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours from now

  const [content] = await db
    .insert(dynamicContentTable)
    .values({
      contentType: "BREAKING_ALERT",
      headline: parsed.data.headline,
      bodyText: parsed.data.bodyText,
      locationTag: parsed.data.locationTag ?? "Hyderabad",
      validUntil,
    })
    .returning();

  res.status(201).json(PushBreakingNewsResponse.parse(formatContent(content)));
});

router.get("/dynamic-content", async (req, res): Promise<void> => {
  const query = ListDynamicContentQueryParams.safeParse(req.query);
  let rows = await db.select().from(dynamicContentTable).orderBy(dynamicContentTable.createdAt);

  if (query.success && query.data.content_type) {
    rows = rows.filter((c) => c.contentType === query.data.content_type);
  }

  res.json(ListDynamicContentResponse.parse(rows.map(formatContent)));
});

router.post("/dynamic-content", async (req, res): Promise<void> => {
  const parsed = CreateDynamicContentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [content] = await db
    .insert(dynamicContentTable)
    .values({
      ...parsed.data,
      validUntil: new Date(parsed.data.validUntil),
    })
    .returning();

  res.status(201).json(CreateDynamicContentResponse.parse(formatContent(content)));
});

router.get("/dynamic-content/:id", async (req, res): Promise<void> => {
  const params = GetDynamicContentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [content] = await db.select().from(dynamicContentTable).where(eq(dynamicContentTable.id, params.data.id));
  if (!content) {
    res.status(404).json({ error: "Content not found" });
    return;
  }

  res.json(GetDynamicContentResponse.parse(formatContent(content)));
});

router.patch("/dynamic-content/:id", async (req, res): Promise<void> => {
  const params = UpdateDynamicContentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateDynamicContentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.headline !== undefined) updates.headline = parsed.data.headline;
  if (parsed.data.bodyText !== undefined) updates.bodyText = parsed.data.bodyText;
  if (parsed.data.iconUrl !== undefined) updates.iconUrl = parsed.data.iconUrl;
  if (parsed.data.locationTag !== undefined) updates.locationTag = parsed.data.locationTag;
  if (parsed.data.validUntil !== undefined) updates.validUntil = new Date(parsed.data.validUntil);

  const [content] = await db
    .update(dynamicContentTable)
    .set(updates)
    .where(eq(dynamicContentTable.id, params.data.id))
    .returning();

  if (!content) {
    res.status(404).json({ error: "Content not found" });
    return;
  }

  res.json(UpdateDynamicContentResponse.parse(formatContent(content)));
});

router.delete("/dynamic-content/:id", async (req, res): Promise<void> => {
  const params = DeleteDynamicContentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [content] = await db
    .delete(dynamicContentTable)
    .where(eq(dynamicContentTable.id, params.data.id))
    .returning();

  if (!content) {
    res.status(404).json({ error: "Content not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
