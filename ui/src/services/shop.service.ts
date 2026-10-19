/** Frontend-only catalogue service. Replace this local data with an API client later. */
import {
  districts,
  freeDeliveryThreshold,
  type Category,
  type Product,
} from "@/data/catalog";
import { effectivePrice } from "@/lib/format";

const categories: Category[] = [
  {
    id: "jewellery",
    name: "Jewellery",
    slug: "jewellery",
    description: "Hand-finished gold jewellery",
    image: "/images/p-necklace.jpg",
    parent: null,
    displayOrder: 1,
    status: "active",
  },
  {
    id: "earrings",
    name: "Earrings",
    slug: "earrings",
    description: "Statement earrings",
    image: "/images/p-earrings.jpg",
    parent: "jewellery",
    displayOrder: 1,
    status: "active",
  },
  {
    id: "necklaces",
    name: "Necklaces",
    slug: "necklaces",
    description: "Temple-inspired necklaces",
    image: "/images/p-necklace.jpg",
    parent: "jewellery",
    displayOrder: 2,
    status: "active",
  },
  {
    id: "bangles",
    name: "Bangles",
    slug: "bangles",
    description: "Gold-finish bangles",
    image: "/images/p-bangles.jpg",
    parent: "jewellery",
    displayOrder: 3,
    status: "active",
  },
  {
    id: "sarees",
    name: "Silk Sarees",
    slug: "sarees",
    description: "Premium silk sarees",
    image: "/images/p-saree.jpg",
    parent: null,
    displayOrder: 2,
    status: "active",
  },
];

const products: Product[] = [
  {
    id: "p-earrings",
    name: "Ruby Jhumka Earrings",
    slug: "ruby-jhumka-earrings",
    sku: "YF-EAR-001",
    categorySlug: "jewellery",
    subcategorySlug: "earrings",
    shortDescription: "Handcrafted ruby and pearl jhumkas",
    description:
      "A festive pair of handcrafted jhumkas with ruby tones and a pearl fringe.",
    images: ["/images/p-earrings.jpg"],
    price: 2499,
    salePrice: 1999,
    stock: 12,
    brand: "Yudhas",
    material: "Gold finish",
    sizes: ["One size"],
    colors: ["Ruby"],
    weight: "42g",
    rating: 4.9,
    reviewCount: 38,
    featured: true,
    newArrival: true,
    soldCount: 184,
    createdAt: "2026-08-20",
    specifications: [],
  },
  {
    id: "p-bangles",
    name: "Polki Layered Bangles",
    slug: "polki-layered-bangles",
    sku: "YF-BAN-002",
    categorySlug: "jewellery",
    subcategorySlug: "bangles",
    shortDescription: "A luminous set of stone-studded bangles",
    description:
      "Layered gold-finish bangles designed to catch the light at every celebration.",
    images: ["/images/p-bangles.jpg"],
    price: 3299,
    salePrice: null,
    stock: 8,
    brand: "Yudhas",
    material: "Gold finish",
    sizes: ["2.4", "2.6", "2.8"],
    colors: ["Gold"],
    weight: "58g",
    rating: 4.8,
    reviewCount: 24,
    featured: true,
    newArrival: false,
    soldCount: 129,
    createdAt: "2026-07-18",
    specifications: [],
  },
  {
    id: "p-necklace",
    name: "Temple Sun Necklace",
    slug: "temple-sun-necklace",
    sku: "YF-NEC-003",
    categorySlug: "jewellery",
    subcategorySlug: "necklaces",
    shortDescription: "A classic temple-inspired statement necklace",
    description:
      "Intricate sun motifs and a graceful pendant bring a ceremonial finish to this heirloom-inspired necklace.",
    images: ["/images/p-necklace.jpg"],
    price: 5499,
    salePrice: 4499,
    stock: 5,
    brand: "Yudhas",
    material: "Gold finish",
    sizes: ["One size"],
    colors: ["Gold"],
    weight: "86g",
    rating: 5,
    reviewCount: 17,
    featured: true,
    newArrival: true,
    soldCount: 76,
    createdAt: "2026-08-29",
    specifications: [],
  },
  {
    id: "p-saree",
    name: "Magenta Kanjivaram Silk",
    slug: "magenta-kanjivaram-silk",
    sku: "YF-SAR-004",
    categorySlug: "sarees",
    subcategorySlug: null,
    shortDescription: "Pure silk with a rose-gold zari border",
    description:
      "A vivid magenta silk saree with a luminous zari border for weddings and milestone celebrations.",
    images: ["/images/p-saree.jpg"],
    price: 8999,
    salePrice: 7499,
    stock: 4,
    brand: "Yudhas",
    material: "Pure silk",
    sizes: ["Free size"],
    colors: ["Magenta"],
    weight: "620g",
    rating: 4.9,
    reviewCount: 31,
    featured: false,
    newArrival: true,
    soldCount: 94,
    createdAt: "2026-08-26",
    specifications: [],
  },
];

const loadCatalog = async () => ({ products, categories });

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
  material?: string;
  sort?:
    | "newest"
    | "price-asc"
    | "price-desc"
    | "popular"
    | "best-selling"
    | "discount";
  page?: number;
  perPage?: number;
};

export const getCategories = async (): Promise<Category[]> =>
  (await loadCatalog()).categories;

export const getCategoryTree = async () => {
  const all = await getCategories();
  return all
    .filter((c) => !c.parent)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((parent) => ({
      ...parent,
      children: all
        .filter((c) => c.parent === parent.slug)
        .sort((a, b) => a.displayOrder - b.displayOrder),
    }));
};

export const listProducts = async (query: ProductQuery = {}) => {
  const {
    category,
    subcategory,
    search,
    minPrice = 0,
    maxPrice = Number.MAX_SAFE_INTEGER,
    discountedOnly,
    inStockOnly,
    size,
    color,
    material,
    sort = "newest",
    page = 1,
    perPage = 9,
  } = query;

  const { products } = await loadCatalog();

  let items = products.filter((p) => {
    const price = effectivePrice(p.price, p.salePrice);
    if (
      category &&
      p.categorySlug !== category &&
      p.subcategorySlug !== category
    )
      return false;
    if (subcategory && p.subcategorySlug !== subcategory) return false;
    if (
      search &&
      !`${p.name} ${p.shortDescription}`
        .toLowerCase()
        .includes(search.toLowerCase())
    )
      return false;
    if (price < minPrice || price > maxPrice) return false;
    if (discountedOnly && !p.salePrice) return false;
    if (inStockOnly && p.stock <= 0) return false;
    if (size && !p.sizes.includes(size)) return false;
    if (color && !p.colors.includes(color)) return false;
    if (material && !p.material.toLowerCase().includes(material.toLowerCase()))
      return false;
    return true;
  });

  items = [...items].sort((a, b) => {
    const pa = effectivePrice(a.price, a.salePrice);
    const pb = effectivePrice(b.price, b.salePrice);
    switch (sort) {
      case "price-asc":
        return pa - pb;
      case "price-desc":
        return pb - pa;
      case "popular":
        return b.rating * b.reviewCount - a.rating * a.reviewCount;
      case "best-selling":
        return b.soldCount - a.soldCount;
      case "discount":
        return (
          (b.salePrice ? (b.price - b.salePrice) / b.price : 0) -
          (a.salePrice ? (a.price - a.salePrice) / a.price : 0)
        );
      default:
        return b.createdAt.localeCompare(a.createdAt);
    }
  });

  const total = items.length;
  const start = (page - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    total,
    page,
    perPage,
    pages: Math.max(1, Math.ceil(total / perPage)),
  };
};

export const getProductBySlug = async (
  slug: string,
): Promise<Product | undefined> =>
  (await loadCatalog()).products.find((p) => p.slug === slug);

export const getProductsByIds = async (ids: string[]): Promise<Product[]> => {
  const { products } = await loadCatalog();
  return ids
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean) as Product[];
};

export const getRelatedProducts = async (slug: string) => {
  const { products } = await loadCatalog();
  const product = products.find((p) => p.slug === slug);
  if (!product) return [];
  return products
    .filter(
      (p) => p.id !== product.id && p.categorySlug === product.categorySlug,
    )
    .slice(0, 4);
};

export const getHomeCollections = async () => {
  const { products } = await loadCatalog();
  return {
    newArrivals: products.filter((p) => p.newArrival).slice(0, 4),
    trending: products.filter((p) => p.featured).slice(0, 4),
    onSale: products.filter((p) => p.salePrice).slice(0, 4),
  };
};

export const getDistricts = async () => districts;

/** Delivery charge by district, with the free-delivery threshold applied. */
export const getDeliveryQuote = async (district: string, subtotal: number) => {
  const match = districts.find((d) => d.name === district);
  if (!match)
    return {
      district: null,
      charge: 0,
      freeDelivery: false,
      threshold: freeDeliveryThreshold,
    };
  const freeDelivery = subtotal >= freeDeliveryThreshold;
  return {
    district: match.name,
    charge: freeDelivery ? 0 : match.charge,
    freeDelivery,
    threshold: freeDeliveryThreshold,
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
  const coupon = coupons.find((c) => c.code === code.trim().toUpperCase());
  if (!coupon) return { ok: false as const, message: "Invalid coupon code" };
  if (subtotal < coupon.minOrder)
    return {
      ok: false as const,
      message: `Valid on orders above ₹${coupon.minOrder.toLocaleString("en-IN")}`,
    };
  const raw =
    coupon.type === "percent" ? (subtotal * coupon.value) / 100 : coupon.value;
  return {
    ok: true as const,
    code: coupon.code,
    discount: Math.min(Math.round(raw), coupon.maxDiscount),
  };
};
