import { readApiResponse } from "@/services/api-response";

const apiUrl = (
  import.meta.env.BACKEND_API_URL || "http://localhost:4000"
).replace(/\/$/, "");

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  status: "active" | "inactive";
};

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  categorySlug: string;
  description: string;
  imageUrl: string;
  price: number;
  salePrice: number | null;
  stock: number;
  featured: boolean;
  sizes: string[];
  colors: string[];
  createdAt: string;
};

export type AdminOrder = {
  _id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  phone: string;
  shippingAddress: string;
  district?: string;
  items: {
    productId: string;
    name: string;
    sku?: string | null;
    categorySlug?: string | null;
    categoryName?: string | null;
    image: string;
    price: number;
    quantity: number;
    size?: string;
    color?: string;
  }[];
  subtotal: number;
  deliveryCharge: number;
  total: number;
  paymentMethod?: "cash_on_delivery" | "razorpay";
  paymentStatus?: "pending" | "created" | "authorized" | "captured" | "failed";
  status: OrderStatus;
  createdAt: string;
};

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type NewOrder = {
  customerName: string;
  phone: string;
  shippingAddress: string;
  couponCode?: string;
  items: {
    productId: string;
    quantity: number;
    size?: string;
    color?: string;
  }[];
};

export type DeliverySettings = {
  deliveryCharge: number | null;
  freeDeliveryThreshold: number;
};

export async function listAdminProducts() {
  const result = await readApiResponse<{ products: AdminProduct[] }>(
    fetch(`${apiUrl}/api/admin/products`, { credentials: "include" }),
    "The admin request could not be completed",
  );
  return result.products;
}

export async function createAdminProduct(data: FormData) {
  const result = await readApiResponse<{ product: AdminProduct }>(
    fetch(`${apiUrl}/api/admin/products`, {
      method: "POST",
      credentials: "include",
      body: data,
    }),
    "The admin request could not be completed",
  );
  return result.product;
}

export async function updateAdminProduct(id: string, data: FormData) {
  const result = await readApiResponse<{ product: AdminProduct }>(
    fetch(`${apiUrl}/api/admin/products/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "include",
      body: data,
    }),
    "The admin request could not be completed",
  );
  return result.product;
}

export async function createAdminCategory(data: { name: string }) {
  const result = await readApiResponse<{ category: AdminCategory }>(
    fetch(`${apiUrl}/api/admin/categories`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
    "The admin request could not be completed",
  );
  return result.category;
}

export async function deleteAdminCategory(id: string) {
  return readApiResponse<{ message: string }>(
    fetch(`${apiUrl}/api/admin/categories/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    }),
    "The admin request could not be completed",
  );
}

export async function deleteAdminProduct(id: string) {
  return readApiResponse<{ message: string }>(
    fetch(`${apiUrl}/api/admin/products/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    }),
    "The admin request could not be completed",
  );
}

export type AdminOrderFilters = {
  status?: OrderStatus;
  from?: string;
  to?: string;
};

export async function listAdminOrders(filters: AdminOrderFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const query = params.size > 0 ? `?${params.toString()}` : "";
  const result = await readApiResponse<{ orders: AdminOrder[] }>(
    fetch(`${apiUrl}/api/orders/admin${query}`, {
      credentials: "include",
    }),
    "The admin request could not be completed",
  );
  return result.orders;
}

export async function getAdminDeliverySettings() {
  const result = await readApiResponse<{ settings: DeliverySettings }>(
    fetch(`${apiUrl}/api/admin/delivery-settings`, {
      credentials: "include",
    }),
    "The admin request could not be completed",
  );
  return result.settings;
}

export async function updateAdminDeliveryCharge(deliveryCharge: number) {
  const result = await readApiResponse<{ settings: DeliverySettings }>(
    fetch(`${apiUrl}/api/admin/delivery-settings`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryCharge }),
    }),
    "The admin request could not be completed",
  );
  return result.settings;
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const result = await readApiResponse<{ order: AdminOrder }>(
    fetch(`${apiUrl}/api/orders/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }),
    "The admin request could not be completed",
  );
  return result.order;
}

export async function createOrder(data: NewOrder) {
  return readApiResponse<{ order: AdminOrder }>(
    fetch(`${apiUrl}/api/orders`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
    "The admin request could not be completed",
  );
}
