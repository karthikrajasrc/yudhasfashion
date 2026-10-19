import { randomBytes } from "node:crypto";
import { Product } from "../models/product.js";
import { DeliverySettings } from "../models/delivery-settings.js";
import { Category } from "../models/category.js";

export class OrderDetailsError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "OrderDetailsError";
    this.status = status;
  }
}

export async function buildOrderDetails(user, input) {
  if (input.items.some((item) => !/^[a-f\d]{24}$/i.test(item.productId))) {
    throw new OrderDetailsError(
      "One or more cart products are unavailable. Refresh your bag and try again.",
    );
  }

  const databaseIds = input.items.map((item) => item.productId);
  const databaseProducts = await Product.find({
    _id: { $in: databaseIds },
    stock: { $gt: 0 },
  });
  const productsById = new Map(
    databaseProducts.map((product) => [product.id, product]),
  );
  const categorySlugs = [
    ...new Set(databaseProducts.map((product) => product.categorySlug)),
  ];
  const categories = await Category.find({ slug: { $in: categorySlugs } })
    .select("name slug")
    .lean();
  const categoryNames = new Map(
    categories.map((category) => [category.slug, category.name]),
  );
  const items = [];
  for (const item of input.items) {
    const product = productsById.get(item.productId);
    if (!product) {
      throw new OrderDetailsError("One or more cart products are unavailable");
    }
    if (item.quantity > product.stock) {
      throw new OrderDetailsError(`${product.name} does not have enough stock`);
    }
    items.push({
      productId: item.productId,
      name: product.name,
      sku: product.sku,
      categorySlug: product.categorySlug,
      categoryName: categoryNames.get(product.categorySlug) ?? "",
      image: product.imageUrl,
      price: product.salePrice ?? product.price,
      quantity: item.quantity,
      size: item.size ?? "",
      color: item.color ?? "",
    });
  }

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const deliverySettings = await DeliverySettings.findOne({ key: "global" });
  if (!deliverySettings) {
    throw new OrderDetailsError(
      "Delivery charges have not been configured. Please try again later.",
      503,
    );
  }

  let discount = 0;
  const couponCode = input.couponCode?.toUpperCase() ?? "";
  if (couponCode === "YUDHAS10" && subtotal >= 2000) {
    discount = Math.min(Math.round(subtotal * 0.1), 1500);
  } else if (couponCode === "GOLD500" && subtotal >= 4000) {
    discount = 500;
  } else if (couponCode) {
    throw new OrderDetailsError(
      "Coupon is invalid or does not meet the minimum order",
    );
  }
  const deliveryCharge =
    subtotal >= deliverySettings.freeDeliveryThreshold
      ? 0
      : deliverySettings.deliveryCharge;

  return {
    orderNumber: `YF-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`,
    user: user._id,
    customerName: input.customerName,
    customerEmail: user.email,
    phone: input.phone,
    shippingAddress: input.shippingAddress,
    items,
    subtotal,
    discount,
    couponCode,
    deliveryCharge,
    total: Math.max(0, subtotal - discount + deliveryCharge),
  };
}
