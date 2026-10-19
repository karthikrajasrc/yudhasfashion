import { Router } from "express";
import multer from "multer";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { Product } from "../models/product.js";
import { Category } from "../models/category.js";
import { requireAdmin, requireAuth } from "../middleware/require-auth.js";

const uploadDirectory = fileURLToPath(
  new URL("../../uploads/", import.meta.url),
);
await mkdir(uploadDirectory, { recursive: true });

const allowedImages = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename(_req, file, callback) {
      callback(
        null,
        `${randomUUID()}${allowedImages.get(file.mimetype) ?? ""}`,
      );
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, callback) {
    if (!allowedImages.has(file.mimetype)) {
      return callback(
        new Error("Upload a JPG, PNG, or WebP image (maximum 5 MB)"),
      );
    }
    return callback(null, true);
  },
});

export const productsRouter = Router();
const productSchema = z.object({
  name: z.string().trim().min(1).max(160),
  sku: z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    z.string().trim().min(1).max(40).optional(),
  ),
  categorySlug: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(5000),
  price: z.coerce.number().finite().min(0),
  salePrice: z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    z.coerce.number().finite().min(0).optional(),
  ),
  stock: z.coerce.number().int().min(0).max(1_000_000),
  featured: z.union([z.literal("true"), z.literal("false")]).optional(),
  sizes: z.preprocess(
    (value) =>
      (Array.isArray(value) ? value : value ? String(value).split(",") : [])
        .map((item) => String(item).trim())
        .filter(Boolean),
    z.array(z.string().trim().min(1).max(100)).max(30),
  ),
  colors: z.preprocess(
    (value) =>
      (Array.isArray(value) ? value : value ? String(value).split(",") : [])
        .map((item) => String(item).trim())
        .filter(Boolean),
    z.array(z.string().trim().min(1).max(100)).max(30),
  ),
});

function serializeProduct(product) {
  return {
    id: product.id ?? String(product._id),
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    categorySlug: product.categorySlug,
    description: product.description,
    images: [product.imageUrl],
    price: product.price,
    salePrice: product.salePrice,
    stock: product.stock,
    sizes: product.sizes,
    colors: product.colors,
    rating: product.rating ?? 0,
    reviewCount: product.reviewCount ?? 0,
    featured: product.featured,
    newArrival: product.newArrival,
    soldCount: product.soldCount,
    specifications: product.specifications,
    createdAt: product.createdAt,
  };
}

function serializeAdminProduct(product) {
  return { ...serializeProduct(product), imageUrl: product.imageUrl };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const publicProductsRouter = Router();

publicProductsRouter.get("/", async (req, res, next) => {
  const page = Math.max(
    1,
    Math.min(10_000, Number.parseInt(req.query.page, 10) || 1),
  );
  const perPage = Math.max(
    1,
    Math.min(48, Number.parseInt(req.query.perPage, 10) || 9),
  );
  const conditions = [];
  if (typeof req.query.category === "string") {
    conditions.push({
      $or: [
        { categorySlug: req.query.category.toLowerCase() },
        { subcategorySlug: req.query.category.toLowerCase() },
      ],
    });
  }
  if (typeof req.query.subcategory === "string") {
    conditions.push({ subcategorySlug: req.query.subcategory.toLowerCase() });
  }
  if (typeof req.query.q === "string" && req.query.q.trim()) {
    const search = escapeRegex(req.query.q.trim());
    conditions.push({
      $or: [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ],
    });
  }
  if (req.query.discounted === "true") {
    conditions.push({ salePrice: { $ne: null } });
  }
  if (req.query.inStock === "true") conditions.push({ stock: { $gt: 0 } });
  if (typeof req.query.size === "string")
    conditions.push({ sizes: req.query.size });
  if (typeof req.query.color === "string")
    conditions.push({ colors: req.query.color });
  if (req.query.featured === "true") conditions.push({ featured: true });
  if (req.query.newArrival === "true") conditions.push({ newArrival: true });

  const minPrice = Math.max(0, Number(req.query.minPrice) || 0);
  const maxPrice = Math.max(
    0,
    Number(req.query.maxPrice) || Number.MAX_SAFE_INTEGER,
  );
  if (minPrice > 0 || maxPrice < Number.MAX_SAFE_INTEGER) {
    conditions.push({
      $expr: {
        $and: [
          { $gte: [{ $ifNull: ["$salePrice", "$price"] }, minPrice] },
          { $lte: [{ $ifNull: ["$salePrice", "$price"] }, maxPrice] },
        ],
      },
    });
  }

  const sorts = {
    newest: { createdAt: -1 },
    "price-asc": { effectivePrice: 1, createdAt: -1 },
    "price-desc": { effectivePrice: -1, createdAt: -1 },
    popular: { soldCount: -1, createdAt: -1 },
    "best-selling": { soldCount: -1, createdAt: -1 },
    discount: { discountPercent: -1, createdAt: -1 },
  };
  const sort = sorts[req.query.sort] ?? sorts.newest;
  try {
    const [result] = await Product.aggregate([
      { $match: conditions.length ? { $and: conditions } : {} },
      {
        $addFields: {
          effectivePrice: { $ifNull: ["$salePrice", "$price"] },
          discountPercent: {
            $cond: [
              { $gt: ["$salePrice", 0] },
              {
                $divide: [{ $subtract: ["$price", "$salePrice"] }, "$price"],
              },
              0,
            ],
          },
        },
      },
      {
        $facet: {
          items: [
            { $sort: sort },
            { $skip: (page - 1) * perPage },
            { $limit: perPage },
          ],
          count: [{ $count: "total" }],
        },
      },
    ]);
    const total = result.count[0]?.total ?? 0;
    return res.json({
      items: result.items.map(serializeProduct),
      total,
      page,
      perPage,
      pages: Math.max(1, Math.ceil(total / perPage)),
    });
  } catch (error) {
    return next(error);
  }
});

publicProductsRouter.get("/:slug/related", async (req, res, next) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug.toLowerCase(),
    });
    if (!product) return res.json({ products: [] });
    const related = await Product.find({
      _id: { $ne: product._id },
      categorySlug: product.categorySlug,
    })
      .sort({ createdAt: -1 })
      .limit(4);
    return res.json({ products: related.map(serializeProduct) });
  } catch (error) {
    return next(error);
  }
});

publicProductsRouter.get("/:slug", async (req, res, next) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug.toLowerCase(),
    });
    if (!product) return res.status(404).json({ message: "Product not found" });
    return res.json({ product: serializeProduct(product) });
  } catch (error) {
    return next(error);
  }
});

productsRouter.use(requireAuth, requireAdmin);

productsRouter.get("/", async (_req, res, next) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 }).limit(500);
    return res.json({ products: products.map(serializeAdminProduct) });
  } catch (error) {
    return next(error);
  }
});

productsRouter.post("/", upload.single("image"), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: "A product image is required" });
  }
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    await unlink(req.file.path);
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Invalid product details",
    });
  }
  const values = parsed.data;
  const category = await Category.findOne({
    slug: values.categorySlug,
    status: "active",
  });
  if (!category) {
    await unlink(req.file.path);
    return res.status(400).json({ message: "Select a valid category" });
  }
  const salePrice = values.salePrice ?? null;
  if (salePrice !== null && salePrice >= values.price) {
    await unlink(req.file.path);
    return res
      .status(400)
      .json({ message: "Sale price must be less than the regular price" });
  }

  const slug = values.name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (!slug) {
    await unlink(req.file.path);
    return res
      .status(400)
      .json({ message: "Product name must include letters or numbers" });
  }
  const sku =
    values.sku?.toUpperCase() || `YF-${randomUUID().slice(0, 8).toUpperCase()}`;
  const imageUrl = `/uploads/${req.file.filename}`;

  try {
    const product = await Product.create({
      ...values,
      slug,
      sku,
      salePrice,
      featured: values.featured === "true",
      imageUrl,
    });
    return res.status(201).json({ product: serializeAdminProduct(product) });
  } catch (error) {
    await unlink(req.file.path);
    if (error?.code === 11000) {
      const field = error.keyPattern?.sku ? "SKU" : "name";
      return res
        .status(409)
        .json({ message: `A product with this ${field} already exists` });
    }
    return next(error);
  }
});

productsRouter.patch("/:id", upload.single("image"), async (req, res, next) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
    if (req.file) await unlink(req.file.path);
    return res.status(400).json({ message: "Invalid product ID" });
  }

  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    if (req.file) await unlink(req.file.path);
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Invalid product details",
    });
  }

  let saved = false;
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      if (req.file) await unlink(req.file.path);
      return res.status(404).json({ message: "Product not found" });
    }

    const category = await Category.findOne({
      slug: parsed.data.categorySlug,
      status: "active",
    });
    if (!category) {
      if (req.file) await unlink(req.file.path);
      return res.status(400).json({ message: "Select a valid category" });
    }

    const salePrice = parsed.data.salePrice ?? null;
    if (salePrice !== null && salePrice >= parsed.data.price) {
      if (req.file) await unlink(req.file.path);
      return res
        .status(400)
        .json({ message: "Sale price must be less than the regular price" });
    }

    const slug = parsed.data.name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    if (!slug) {
      if (req.file) await unlink(req.file.path);
      return res
        .status(400)
        .json({ message: "Product name must include letters or numbers" });
    }

    const previousImageUrl = product.imageUrl;
    const newImageUrl = req.file
      ? `/uploads/${req.file.filename}`
      : previousImageUrl;

    product.name = parsed.data.name;
    product.slug = slug;
    product.sku = parsed.data.sku?.toUpperCase() || product.sku;
    product.categorySlug = parsed.data.categorySlug;
    product.description = parsed.data.description;
    product.price = parsed.data.price;
    product.salePrice = salePrice;
    product.stock = parsed.data.stock;
    product.featured = parsed.data.featured === "true";
    product.sizes = parsed.data.sizes;
    product.colors = parsed.data.colors;
    product.imageUrl = newImageUrl;

    await product.save();
    saved = true;

    if (
      req.file &&
      previousImageUrl !== newImageUrl &&
      previousImageUrl.startsWith("/uploads/")
    ) {
      const oldFilename = path.basename(previousImageUrl);
      await unlink(path.join(uploadDirectory, oldFilename)).catch((error) => {
        if (error.code !== "ENOENT") {
          console.error("Unable to remove replaced product image:", error);
        }
      });
    }

    return res.json({ product: serializeAdminProduct(product) });
  } catch (error) {
    if (req.file && !saved) await unlink(req.file.path);
    if (error?.code === 11000) {
      const field = error.keyPattern?.sku ? "SKU" : "name";
      return res
        .status(409)
        .json({ message: `A product with this ${field} already exists` });
    }
    return next(error);
  }
});

productsRouter.delete("/:id", async (req, res, next) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
    return res.status(400).json({ message: "Invalid product ID" });
  }
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (product.imageUrl.startsWith("/uploads/")) {
      const filename = path.basename(product.imageUrl);
      await unlink(path.join(uploadDirectory, filename)).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      });
    }
    return res.json({ message: "Product deleted" });
  } catch (error) {
    return next(error);
  }
});
