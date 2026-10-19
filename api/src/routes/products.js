import { Router } from "express";
import multer from "multer";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { Product } from "../models/product.js";
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
  shortDescription: z.string().trim().min(1).max(240),
  description: z.string().trim().min(1).max(5000),
  price: z.coerce.number().finite().min(0),
  salePrice: z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    z.coerce.number().finite().min(0).optional(),
  ),
  stock: z.coerce.number().int().min(0).max(1_000_000),
  featured: z.union([z.literal("true"), z.literal("false")]).optional(),
});

function serializeProduct(product) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    categorySlug: product.categorySlug,
    shortDescription: product.shortDescription,
    description: product.description,
    imageUrl: product.imageUrl,
    price: product.price,
    salePrice: product.salePrice,
    stock: product.stock,
    featured: product.featured,
    createdAt: product.createdAt,
  };
}

productsRouter.use(requireAuth, requireAdmin);

productsRouter.get("/", async (_req, res, next) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 }).limit(500);
    return res.json({ products: products.map(serializeProduct) });
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
    return res.status(201).json({ product: serializeProduct(product) });
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
