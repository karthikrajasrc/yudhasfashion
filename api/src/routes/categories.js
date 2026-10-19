import { Router } from "express";
import { z } from "zod";
import { Category } from "../models/category.js";
import { Product } from "../models/product.js";
import { requireAdmin, requireAuth } from "../middleware/require-auth.js";

export const categoriesRouter = Router();
export const adminCategoriesRouter = Router();

function serializeCategory(category) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    displayOrder: category.displayOrder,
    status: category.status,
  };
}

categoriesRouter.get("/", async (_req, res, next) => {
  try {
    const categories = await Category.find({ status: "active" })
      .sort({ displayOrder: 1, name: 1 })
      .limit(500);
    return res.json({ categories: categories.map(serializeCategory) });
  } catch (error) {
    return next(error);
  }
});

adminCategoriesRouter.use(requireAuth, requireAdmin);

adminCategoriesRouter.get("/", async (_req, res, next) => {
  try {
    const categories = await Category.find()
      .sort({ displayOrder: 1, name: 1 })
      .limit(500);
    return res.json({ categories: categories.map(serializeCategory) });
  } catch (error) {
    return next(error);
  }
});

adminCategoriesRouter.post("/", async (req, res, next) => {
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(80),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Invalid category details",
    });
  }

  const slug = parsed.data.name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (!slug) {
    return res.status(400).json({
      message: "Category name must include letters or numbers",
    });
  }

  try {
    const category = await Category.create({
      ...parsed.data,
      slug,
      displayOrder: await Category.countDocuments(),
    });
    return res.status(201).json({ category: serializeCategory(category) });
  } catch (error) {
    if (error?.code === 11000) {
      return res
        .status(409)
        .json({ message: "A category with this name already exists" });
    }
    return next(error);
  }
});

adminCategoriesRouter.delete("/:id", async (req, res, next) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
    return res.status(400).json({ message: "Invalid category ID" });
  }

  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const productCount = await Product.countDocuments({
      categorySlug: category.slug,
    });
    if (productCount > 0) {
      return res.status(409).json({
        message:
          "Delete or reassign this category's products before removing it",
      });
    }

    await category.deleteOne();
    return res.json({ message: "Category deleted" });
  } catch (error) {
    return next(error);
  }
});
