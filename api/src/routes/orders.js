import { Router } from "express";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { User } from "../models/user.js";
import { Order } from "../models/order.js";
import { Product } from "../models/product.js";
import { storeProducts } from "../constants/catalog-products.js";
import { requireAdmin, requireAuth } from "../middleware/require-auth.js";

export const ordersRouter = Router();
const createOrderSchema = z.object({
  customerName: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(7).max(30),
  shippingAddress: z.string().trim().min(5).max(1000),
  district: z.string().trim().min(1).max(100),
  couponCode: z.string().trim().max(40).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(100),
        quantity: z.number().int().min(1).max(99),
        size: z.string().max(100).optional(),
        color: z.string().max(100).optional(),
      }),
    )
    .min(1)
    .max(50),
});
const allowedStatuses = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

ordersRouter.post("/", requireAuth, async (req, res, next) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Invalid order details",
    });
  }
  try {
    const user = await User.findById(req.authUserId);
    if (!user)
      return res.status(401).json({ message: "Authentication required" });
    const databaseIds = parsed.data.items
      .map((item) => item.productId)
      .filter((id) => /^[a-f\d]{24}$/i.test(id));
    const databaseProducts = await Product.find({ _id: { $in: databaseIds } });
    const productsById = new Map(
      databaseProducts.map((product) => [product.id, product]),
    );
    const items = [];
    for (const item of parsed.data.items) {
      const product = productsById.get(item.productId);
      const snapshot = product
        ? {
            name: product.name,
            image: product.imageUrl,
            price: product.salePrice ?? product.price,
          }
        : storeProducts.get(item.productId);
      if (!snapshot) {
        return res
          .status(400)
          .json({ message: "One or more cart products are unavailable" });
      }
      items.push({ ...snapshot, ...item });
    }
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const deliveryRates = new Map([
      ["Chennai", 50],
      ["Coimbatore", 70],
      ["Madurai", 80],
      ["Trichy", 60],
      ["Salem", 65],
    ]);
    const deliveryRate = deliveryRates.get(parsed.data.district);
    if (deliveryRate === undefined) {
      return res
        .status(400)
        .json({ message: "Select a supported delivery district" });
    }
    let discount = 0;
    const couponCode = parsed.data.couponCode?.toUpperCase() ?? "";
    if (couponCode === "YUDHAS10" && subtotal >= 2000) {
      discount = Math.min(Math.round(subtotal * 0.1), 1500);
    } else if (couponCode === "GOLD500" && subtotal >= 4000) {
      discount = 500;
    } else if (couponCode) {
      return res.status(400).json({
        message: "Coupon is invalid or does not meet the minimum order",
      });
    }
    const deliveryCharge = subtotal >= 5000 ? 0 : deliveryRate;
    const order = await Order.create({
      ...parsed.data,
      items,
      customerEmail: user.email,
      user: user._id,
      orderNumber: `YF-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`,
      subtotal,
      discount,
      couponCode,
      deliveryCharge,
      total: Math.max(0, subtotal - discount + deliveryCharge),
    });
    return res.status(201).json({ order });
  } catch (error) {
    return next(error);
  }
});

ordersRouter.get(
  "/admin",
  requireAuth,
  requireAdmin,
  async (_req, res, next) => {
    try {
      const orders = await Order.find()
        .sort({ createdAt: -1 })
        .limit(500)
        .populate("user", "name email");
      return res.json({ orders });
    } catch (error) {
      return next(error);
    }
  },
);

ordersRouter.patch(
  "/:id/status",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }
    const parsed = z
      .object({ status: z.enum(allowedStatuses) })
      .safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ message: "Invalid order status" });
    try {
      const order = await Order.findByIdAndUpdate(
        req.params.id,
        { $set: { status: parsed.data.status } },
        { new: true, runValidators: true },
      );
      if (!order) return res.status(404).json({ message: "Order not found" });
      return res.json({ order });
    } catch (error) {
      return next(error);
    }
  },
);
