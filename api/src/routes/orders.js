import { Router } from "express";
import { z } from "zod";
import { Order } from "../models/order.js";
import { Product } from "../models/product.js";
import { Category } from "../models/category.js";
import { requireAdmin, requireAuth } from "../middleware/require-auth.js";

export const ordersRouter = Router();
export const createOrderSchema = z.object({
  customerName: z.string().trim().min(1).max(100),
  customerEmail: z.string().trim().email().max(255).optional(),
  phone: z.string().trim().regex(/^\d{10}$/, "Phone number must contain exactly 10 digits"),
  shippingAddress: z.string().trim().min(5).max(1000),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  pincode: z.string().trim().regex(/^\d{6}$/, "PIN code must contain exactly 6 digits"),
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

async function addProductDetails(orders) {
  const productIds = [
    ...new Set(
      orders.flatMap((order) =>
        order.items
          .map((item) => item.productId)
          .filter((id) => /^[a-f\d]{24}$/i.test(id)),
      ),
    ),
  ];
  const products = await Product.find({ _id: { $in: productIds } })
    .select("sku categorySlug")
    .lean();
  const categorySlugs = [
    ...new Set(products.map((product) => product.categorySlug)),
  ];
  const categories = await Category.find({ slug: { $in: categorySlugs } })
    .select("name slug")
    .lean();
  const productsById = new Map(
    products.map((product) => [String(product._id), product]),
  );
  const categoriesBySlug = new Map(
    categories.map((category) => [category.slug, category.name]),
  );

  return orders.map((order) => {
    const orderData = order.toObject();
    orderData.items = orderData.items.map((item) => {
      const product = productsById.get(item.productId);
      return {
        ...item,
        sku: item.sku ?? product?.sku ?? null,
        categorySlug: item.categorySlug ?? product?.categorySlug ?? null,
        categoryName:
          item.categoryName ??
          (product ? categoriesBySlug.get(product.categorySlug) : null) ??
          null,
      };
    });
    return orderData;
  });
}

ordersRouter.post("/track", async (req, res, next) => {
  const parsed = z
    .object({
      orderId: z.string().trim().max(100).optional(),
      phone: z.string().trim().regex(/^\d{10}$/, "Phone number must contain exactly 10 digits").optional(),
      email: z.string().trim().email().max(255).optional(),
    })
    .refine((value) => value.orderId || value.phone, {
      message: "Enter an order ID or phone number",
    })
    .safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Invalid tracking details",
    });
  }

  try {
    const query = parsed.data.orderId
      ? { orderNumber: parsed.data.orderId }
      : { phone: parsed.data.phone };
    const order = await Order.findOne(query).sort({ createdAt: -1 });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (
      parsed.data.email &&
      order.customerEmail?.toLowerCase() !== parsed.data.email.toLowerCase()
    ) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (parsed.data.phone && parsed.data.orderId) {
      if (
        order.orderNumber !== parsed.data.orderId ||
        order.phone !== parsed.data.phone
      ) {
        return res.status(404).json({ message: "Order not found" });
      }
    }
    const [trackedOrder] = await addProductDetails([order]);
    return res.json({ order: trackedOrder });
  } catch (error) {
    return next(error);
  }
});

ordersRouter.get(
  "/admin",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    const filters = z
      .object({
        status: z.enum(allowedStatuses).optional(),
        from: z.string().datetime({ offset: true }).optional(),
        to: z.string().datetime({ offset: true }).optional(),
      })
      .safeParse(req.query);
    if (!filters.success) {
      return res.status(400).json({ message: "Invalid order filters" });
    }

    const { from, to, status } = filters.data;
    const startDate = from ? new Date(from) : undefined;
    const endExclusive = to ? new Date(to) : undefined;
    if (startDate && endExclusive && startDate >= endExclusive) {
      return res
        .status(400)
        .json({ message: "Start date must be on or before end date" });
    }

    try {
      const query = {};
      if (status) query.status = status;
      if (startDate || endExclusive) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = startDate;
        if (endExclusive) query.createdAt.$lt = endExclusive;
      }

      const orders = await Order.find(query)
        .sort({ createdAt: -1 })
        .limit(500)
        .populate("user", "name email");
      return res.json({ orders: await addProductDetails(orders) });
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
