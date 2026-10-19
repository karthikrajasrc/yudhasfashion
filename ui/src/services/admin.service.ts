const apiUrl = (
  import.meta.env["VITE_API_URL"] ?? "http://localhost:4000"
).replace(/\/$/, "");

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  categorySlug: string;
  shortDescription: string;
  description: string;
  imageUrl: string;
  price: number;
  salePrice: number | null;
  stock: number;
  featured: boolean;
  createdAt: string;
};

export type AdminOrder = {
  _id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  phone: string;
  shippingAddress: string;
  district: string;
  items: {
    productId: string;
    name: string;
    image: string;
    price: number;
    quantity: number;
    size?: string;
    color?: string;
  }[];
  subtotal: number;
  deliveryCharge: number;
  total: number;
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
  district: string;
  couponCode?: string;
  items: {
    productId: string;
    quantity: number;
    size?: string;
    color?: string;
  }[];
};

async function readResponse<T>(response: Response): Promise<T> {
  const result = (await response.json().catch(() => null)) as
    (T & { message?: string }) | null;
  if (!response.ok) {
    throw new Error(
      result?.message ?? "The admin request could not be completed",
    );
  }
  if (!result) throw new Error("The API returned an empty response");
  return result;
}

export async function listAdminProducts() {
  const result = await readResponse<{ products: AdminProduct[] }>(
    await fetch(`${apiUrl}/api/admin/products`, { credentials: "include" }),
  );
  return result.products;
}

export async function createAdminProduct(data: FormData) {
  const result = await readResponse<{ product: AdminProduct }>(
    await fetch(`${apiUrl}/api/admin/products`, {
      method: "POST",
      credentials: "include",
      body: data,
    }),
  );
  return result.product;
}

export async function deleteAdminProduct(id: string) {
  return readResponse<{ message: string }>(
    await fetch(`${apiUrl}/api/admin/products/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    }),
  );
}

export async function listAdminOrders() {
  const result = await readResponse<{ orders: AdminOrder[] }>(
    await fetch(`${apiUrl}/api/orders/admin`, { credentials: "include" }),
  );
  return result.orders;
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const result = await readResponse<{ order: AdminOrder }>(
    await fetch(`${apiUrl}/api/orders/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }),
  );
  return result.order;
}

export async function createOrder(data: NewOrder) {
  return readResponse<{ order: AdminOrder }>(
    await fetch(`${apiUrl}/api/orders`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  );
}
