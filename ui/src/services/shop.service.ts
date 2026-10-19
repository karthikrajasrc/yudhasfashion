import type { Category, Product } from "@/data/catalog";
import { readApiResponse } from "@/services/api-response";

const apiUrl = (
  import.meta.env.BACKEND_API_URL || "http://localhost:4000"
).replace(/\/$/, "");

export type ProductQuery = {
  category?: string;
  subcategory?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  discountedOnly?: boolean;
  inStockOnly?: boolean;
  size?: string;
  color?: string;
  sort?:
    | "newest"
    | "price-asc"
    | "price-desc"
    | "popular"
    | "best-selling"
    | "discount";
  page?: number;
  perPage?: number;
  featuredOnly?: boolean;
  newArrivalsOnly?: boolean;
};

async function getJson<T>(path: string): Promise<T> {
  return readApiResponse(fetch(`${apiUrl}${path}`), "Unable to load products");
}

function withImageOrigin(product: Product): Product {
  const image = product.images[0];
  if (!image || image.startsWith("http")) return product;
  return {
    ...product,
    images: [`${apiUrl}${image}`, ...product.images.slice(1)],
  };
}

function toProductListQuery(query: ProductQuery) {
  const params = new URLSearchParams();
  if (query.category) params.set("category", query.category);
  if (query.subcategory) params.set("subcategory", query.subcategory);
  if (query.search) params.set("q", query.search);
  if (query.minPrice !== undefined)
    params.set("minPrice", String(query.minPrice));
  if (query.maxPrice !== undefined)
    params.set("maxPrice", String(query.maxPrice));
  if (query.discountedOnly) params.set("discounted", "true");
  if (query.inStockOnly) params.set("inStock", "true");
  if (query.size) params.set("size", query.size);
  if (query.color) params.set("color", query.color);
  if (query.featuredOnly) params.set("featured", "true");
  if (query.newArrivalsOnly) params.set("newArrival", "true");
  if (query.sort) params.set("sort", query.sort);
  if (query.page) params.set("page", String(query.page));
  if (query.perPage) params.set("perPage", String(query.perPage));
  return params;
}

export const getCategories = async (): Promise<Category[]> => {
  const result = await getJson<{ categories: Category[] }>("/api/categories");
  return result.categories;
};

export const getCategoryTree = async () => {
  const all = await getCategories();
  return all
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((category) => ({ ...category, children: [] as Category[] }));
};

export const listProducts = async (query: ProductQuery = {}) => {
  const params = toProductListQuery(query);
  const search = params.size ? `?${params.toString()}` : "";
  const result = await getJson<{
    items: Product[];
    total: number;
    page: number;
    perPage: number;
    pages: number;
  }>(`/api/products${search}`);
  return { ...result, items: result.items.map(withImageOrigin) };
};

export const getProductBySlug = async (
  slug: string,
): Promise<Product | undefined> => {
  try {
    const result = await getJson<{ product: Product }>(
      `/api/products/${encodeURIComponent(slug)}`,
    );
    return withImageOrigin(result.product);
  } catch (error) {
    if (error instanceof Error && error.message === "Product not found") {
      return undefined;
    }
    throw error;
  }
};

export const getRelatedProducts = async (slug: string): Promise<Product[]> => {
  const result = await getJson<{ products: Product[] }>(
    `/api/products/${encodeURIComponent(slug)}/related`,
  );
  return result.products.map(withImageOrigin);
};

export const getHomeCollections = async () => {
  const [newArrivals, trending, onSale] = await Promise.all([
    listProducts({ newArrivalsOnly: true, perPage: 4 }),
    listProducts({ featuredOnly: true, perPage: 4 }),
    listProducts({ discountedOnly: true, perPage: 4 }),
  ]);
  return {
    newArrivals: newArrivals.items,
    trending: trending.items,
    onSale: onSale.items,
  };
};

export const getCategoryProducts = async (categorySlugs: string[]) => {
  const entries = await Promise.all(
    categorySlugs.map(async (slug) => {
      const result = await listProducts({
        category: slug,
        perPage: 8,
        sort: "newest",
      });
      return [slug, result.items] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<string, Product[]>;
};

export type DeliverySettings = {
  deliveryCharge: number | null;
  freeDeliveryThreshold: number;
};

export const getDeliverySettings = async (): Promise<DeliverySettings> => {
  const result = await getJson<{ settings: DeliverySettings }>(
    "/api/delivery-settings",
  );
  return result.settings;
};

export const getDeliveryQuote = (
  subtotal: number,
  settings: DeliverySettings | undefined,
) => {
  if (!settings || settings.deliveryCharge === null) return null;
  const freeDelivery = subtotal >= settings.freeDeliveryThreshold;
  return {
    charge: freeDelivery ? 0 : settings.deliveryCharge,
    freeDelivery,
    threshold: settings.freeDeliveryThreshold,
  };
};

export const validateCoupon = async (code: string, subtotal: number) => {
  const coupons = [
    {
      code: "YUDHAS10",
      type: "percent" as const,
      value: 10,
      minOrder: 2000,
      maxDiscount: 1500,
    },
    {
      code: "GOLD500",
      type: "fixed" as const,
      value: 500,
      minOrder: 4000,
      maxDiscount: 500,
    },
  ];
  const coupon = coupons.find(
    (item) => item.code === code.trim().toUpperCase(),
  );
  if (!coupon) return { ok: false as const, message: "Invalid coupon code" };
  if (subtotal < coupon.minOrder) {
    return {
      ok: false as const,
      message: `Valid on orders above ₹${coupon.minOrder.toLocaleString("en-IN")}`,
    };
  }
  const raw =
    coupon.type === "percent" ? (subtotal * coupon.value) / 100 : coupon.value;
  return {
    ok: true as const,
    code: coupon.code,
    discount: Math.min(Math.round(raw), coupon.maxDiscount),
  };
};
