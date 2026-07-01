import type { Request, Response } from "express";
import { PlatformCategory } from "../models/PlatformCategory";
import { ok } from "../utils/response";

// list active platform categories
export async function listCategories(_req: Request, res: Response): Promise<void> {
  const cats = await PlatformCategory.find({ isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .lean();
  ok(res, {
    categories: cats.map((c) => ({
      id:    c.slug,
      slug:  c.slug,
      name:  c.name,
      emoji: c.emoji,
    })),
  });
}
