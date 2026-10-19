export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  parent: string | null;
  displayOrder: number;
  status: "active" | "inactive";
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  categorySlug: string;
  subcategorySlug: string | null;
  shortDescription: string;
  description: string;
  images: string[];
  price: number;
  salePrice: number | null;
  stock: number;
  brand: string;
  material: string;
  sizes: string[];
  colors: string[];
  weight: string;
  rating: number;
  reviewCount: number;
  featured: boolean;
  newArrival: boolean;
  soldCount: number;
  createdAt: string;
  specifications: { label: string; value: string }[];
};

export const districts = [
  { name: "Chennai", charge: 50 },
  { name: "Coimbatore", charge: 70 },
  { name: "Madurai", charge: 80 },
  { name: "Trichy", charge: 60 },
  { name: "Salem", charge: 65 },
];

export const freeDeliveryThreshold = 5000;
