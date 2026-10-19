export type Category = {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  status: "active" | "inactive";
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  categorySlug: string;
  description: string;
  images: string[];
  price: number;
  salePrice: number | null;
  stock: number;
  sizes: string[];
  colors: string[];
  rating: number;
  reviewCount: number;
  featured: boolean;
  newArrival: boolean;
  soldCount: number;
  createdAt: string;
  specifications: { label: string; value: string }[];
};
